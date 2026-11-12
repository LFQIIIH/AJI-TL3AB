# Espace admin : mise en route (une seule fois)

1. **Base de données.** Supabase → SQL Editor → New query → colle le contenu de
   `supabase/migrations/0007_matches_admin.sql` → Run.
2. **Te mettre admin.** Dans une nouvelle requête (remplace par l'e-mail de ton compte sur le site) :
   ```sql
   insert into public.staff (user_id, role)
   select id, 'admin' from auth.users where lower(email) = lower('ton@email.com')
   on conflict (user_id) do update set role = 'admin';
   ```
3. **Ouvrir l'espace admin.** Connecte-toi sur le site → Mon compte → « Espace admin »
   (ou va sur https://www.ajitl3ab.com/admin).
4. **Importer le Google Sheet.** En bas de la page Matchs : « Importer le Google Sheet ».
   Tous les matchs et résultats sont copiés, avec les mêmes identifiants
   (réservations, votes et stats restent liés). À faire une seule fois.
5. **Basculer le site sur la base.** Vercel → Project → Settings → Environment Variables :
   `MATCHES_SOURCE` = `supabase` (Production) → Redeploy.
   À partir de là, les matchs se gèrent dans /admin ; le Google Sheet « Matchs » n'est plus lu.
6. **Terrains.** Onglet Terrains : complète l'adresse et le lien Google Maps de chaque terrain
   (le bouton « Itinéraire » du site l'utilisera).
7. **Capitaines (optionnel).** Onglet Équipe : ajoute l'e-mail de compte d'un capitaine.
   Il ne voit que ses matchs : liste des joueurs avec numéros, présence, buts, score.

Retour arrière : supprimer la variable `MATCHES_SOURCE` dans Vercel → Redeploy → le site relit le Google Sheet.
