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

## Portefeuille (Phase 1)

- **Recharger un joueur** : /admin → Joueurs → cherche le nom ou le téléphone → clique sur le joueur →
  Montant + Moyen (cash, virement, WhatsApp) → Enregistrer. Le solde est crédité tout de suite.
- **Corriger une erreur** : même formulaire, Type « Correction (−) ».
- **Joueur de confiance** : sur la fiche du joueur, « Marquer de confiance ». Il peut réserver même sans solde
  (son solde devient négatif = ce qu'il te doit). En haut de la liste : le total à encaisser.
- **Annulations** (automatique) : jusqu'à 24 h avant le match, le joueur récupère 100 % sur son portefeuille ;
  après, 50 %. Si tu annules un match (bouton « Annuler le match »), tout le monde est remboursé à 100 %.
- **Liste d'attente** (automatique) : quand une place se libère, le premier joueur en attente qui a assez de solde
  (ou qui est de confiance) est inscrit et débité.
- **Règlement** : texte dans `lib/rules.ts`, page /regles. Accepté une fois avant la première réservation.
- Les joueurs sans compte peuvent toujours réserver par WhatsApp : ajoute-les dans « Places prises hors site ».

## Publication programmée (Phase 2)

- Dans le formulaire du match : « Publier le » + « Publier à ». Vide = visible tout de suite.
- Avant cette date, le match est caché sur le site et ne peut pas être réservé ; /jouer affiche
  « Nouveaux matchs publiés dans … » avec un compte à rebours, et la liste se met à jour toute seule à l'heure dite.
- Astuce : crée tous les matchs de la semaine avec la même date de publication (ex. samedi 23:59),
  comme ça tout le monde a la même chance de réserver.
- Catégorie (Mixte / Hommes / Femmes / Enfants) : un filtre apparaît sur /jouer dès qu'il y a plusieurs catégories.

## Direct, avis et photos (Phase 3)

- **Direct du match** : sur la fiche d'un match, le bouton « ⚽ Direct » s'affiche de 30 min avant le coup d'envoi à 3 jours après (admin et capitaine du match). Sur le téléphone :
  1. range chaque joueur en Équipe 1 ou 2 ;
  2. pendant le match, « But Équipe 1/2 » → buteur → passeur (ou « Pas de passe décisive ») ; « Joueur invité / hors site » pour un pote ou un joueur inscrit par WhatsApp ;
  3. cartons jaunes / rouges ; « Annuler » sur une ligne pour corriger.
  Le score, les buts et les passes de chaque joueur se calculent tout seuls. Un score tapé à la main reste valable tant qu'aucun but n'est saisi dans le direct.
- **Page publique du match** (`/match/…`, lien « Détails du match » sous chaque résultat) : score, buteurs, passeurs, cartons, joueurs élus, présents. Non indexée par Google.
- **Avis des joueurs** : les joueurs marqués présents notent l'organisation, l'arbitrage, l'intensité et le niveau depuis leur compte, de 1 h à 49 h après le match. Les moyennes et commentaires (sans nom) s'affichent sur la fiche du match.
- **Photos et vidéos** : sur la fiche du match, « Ajouter photos / vidéos » (JPG, PNG, WebP, HEIC, MP4, MOV, WebM ; 50 Mo max par fichier). Seuls le staff et les joueurs marqués **présents** peuvent les voir ; les autres voient seulement « N photos privées ». Pense à décocher « Présent » pour un absent avant d'ajouter les photos.

## Points, niveaux, profils (Phase 4)

- **Points** (calculés tout seuls à partir des matchs, aucun réglage) : match joué +10, victoire +5, nul +2, but +3, passe +2, élu du match +5, chaque 4ᵉ semaine d'affilée +10, avis donné +1, carton jaune −3, rouge −10, annulation à moins de 24 h −5. Victoires et cartons comptent seulement quand ils sont saisis dans le « Direct ».
  Pour changer un barème : la fonction `points_rule` (base de données) **et** le texte dans `lib/points.ts`.
- **Niveau** (1 à 10) = points de tous les temps. **Palier du mois** = points du mois : Bronze 20, Argent 60, Or 120, Diamant 200 (remis à zéro le 1er).
- **Classement des points** et **recherche de joueur** en haut de /classement.
- **Profil joueur** `/joueur/…` : prénom + initiale, poste, niveau, stats, badges, derniers matchs. Jamais téléphone, e-mail ou date de naissance. Chaque joueur peut le cacher dans son compte (« Profil public ») : plus de page ni de recherche, son nom reste dans le classement sans lien. Pages non indexées par Google.
- Une erreur de présence, de but ou de carton corrigée dans l'admin corrige aussi les points.
