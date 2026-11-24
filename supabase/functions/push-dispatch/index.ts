// Sends due push notifications (new matches, match card ready, vote open,
// weekly streak). Called every 10 minutes by pg_cron with the dispatch key
// stored in public.app_settings; VAPID keys are created on first run and
// never leave the database.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function setting(key: string): Promise<string | null> {
  const { data } = await db.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  let publicKey = await setting("vapid_public");
  let privateKey = await setting("vapid_private");
  if (!publicKey || !privateKey) {
    const k = webpush.generateVAPIDKeys();
    await db.from("app_settings").upsert(
      [
        { key: "vapid_public", value: k.publicKey },
        { key: "vapid_private", value: k.privateKey },
      ],
      { onConflict: "key", ignoreDuplicates: true },
    );
    publicKey = await setting("vapid_public");
    privateKey = await setting("vapid_private");
  }
  return { publicKey: publicKey!, privateKey: privateKey! };
}

type Due = { user_id: string; title: string; body: string; url: string; tag: string };
type Sub = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req) => {
  const expected = await setting("dispatch_key");
  if (!expected || req.headers.get("x-dispatch-key") !== expected) return new Response("forbidden", { status: 403 });

  const { publicKey, privateKey } = await vapidKeys();
  webpush.setVapidDetails("https://www.ajitl3ab.com", publicKey, privateKey);

  const { data: due, error } = await db.rpc("push_take_due");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const items = (due ?? []) as Due[];
  if (!items.length) return Response.json({ sent: 0 });

  const userIds = [...new Set(items.map((d) => d.user_id))];
  const { data: subsData } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
  const subs = (subsData ?? []) as Sub[];

  let sent = 0, failed = 0;
  const gone: number[] = [];
  await Promise.all(
    items.flatMap((d) =>
      subs
        .filter((s) => s.user_id === d.user_id)
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: d.title, body: d.body, url: d.url, tag: d.tag }),
              { TTL: 86400, urgency: "normal" },
            );
            sent++;
          } catch (e) {
            failed++;
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) gone.push(s.id);
          }
        }),
    ),
  );
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  return Response.json({ due: items.length, sent, failed, removed: gone.length });
});
