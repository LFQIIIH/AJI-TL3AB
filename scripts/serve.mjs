// Starts `next start` (production build) on a free port for the check scripts.
import { spawn } from "node:child_process";
import { createServer } from "node:net";

function freePort() {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export async function startServer() {
  const port = await freePort();
  const child = spawn("npx", ["next", "start", "-p", String(port)], { stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(base, { redirect: "manual" });
      return { base, stop: () => process.kill(-child.pid) };
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  process.kill(-child.pid);
  throw new Error(`next start did not come up (did you run "npm run build"?)\n${log}`);
}
