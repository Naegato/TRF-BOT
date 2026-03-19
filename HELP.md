# Commandes du bot

## Commandes utilisateur

| Commande | Description | Options |
|---|---|---|
| `/register` | S'inscrire sur le serveur | Aucune — guide interactif (ESGI ou Externe, puis année/filière/rentrée) |
| `/profile` | Voir son profil (infos + points OPEN de la période en cours) | Aucune |
| `/points` | Voir le détail de ses points pour la période en cours (preuves, séances, total) | Aucune |
| `/points-history` | Voir l'historique de tous ses points (paginé, 10 par page) | `page` *(optionnel)* — numéro de page |
| `/presence` | Marquer sa présence pour la séance en cours | Aucune |
| `/delete-account` | Supprimer son propre compte (rôles et surnom réinitialisés) | `confirmation` — taper `SUPPRIMER` |

---

## Commandes admin (gérants et adjoints)

| Commande | Description | Options |
|---|---|---|
| `/admin-register` | Inscrire manuellement un utilisateur | `user`, `firstname`, `lastname`, `role` *(ESGI / Externe / Gérant / Adjoint)*, `year`†, `track`†, `intake`† |
| `/set-role` | Modifier le rôle d'un utilisateur inscrit | `user`, `role` *(Externe / ESGI / Gérant / Adjoint)* |
| `/delete-user` | Supprimer le compte d'un utilisateur (rôles et surnom réinitialisés) | `user` |
| `/list-users` | Lister tous les utilisateurs inscrits, groupés par rôle | Aucune |
| `/open-session` | Ouvrir immédiatement une séance de présence | Aucune |
| `/close-session` | Fermer la séance de présence en cours | Aucune |
| `/schedule-session` | Planifier une séance (ouverture et fermeture automatiques) | `date` *(AAAA-MM-JJ)*, `start` *(HH:MM)*, `end` *(HH:MM)* — heure de Paris |
| `/create-rendu` | Générer un rapport CSV de points et l'envoyer dans `#rendu` (réinitialise la période) | `year`†, `track`†, `intake`† — filtres optionnels |

> † Obligatoire pour `/admin-register` uniquement si le rôle est `ESGI`.

---

## Commandes réservées au gérant

| Commande | Description | Options |
|---|---|---|
| `/reset-server` | Supprimer tous les rôles, canaux et surnoms gérés par le bot | `confirmation` — taper `RESET SERVER` |
| `/stop-bot` | Arrêter le bot proprement (message de maintenance dans `#commands-bot`) | `raison` *(optionnel)* |

---

## Commande réservée au propriétaire du serveur

| Commande | Description | Options |
|---|---|---|
| `/set-rules-message` | Définir manuellement l'ID du message de règlement en base de données | `message_id` — ID Discord du message (clic droit → Copier l'identifiant) |

---

## Rôles

### Rôles principaux

| Rôle | Description |
|---|---|
| `ESGI` | Étudiant(e) ESGI |
| `Externe` | Membre externe |
| `Adjoint` | Adjoint — accès aux commandes admin |
| `Gérant` | Gérant — accès à toutes les commandes, y compris `/reset-server` et `/stop-bot` |
| `Temp` | Attribué à la connexion, retiré après acceptation du règlement (réaction ✅ sur `#règlement`) |

### Rôles automatiques (ESGI uniquement)

| Catégorie | Valeurs |
|---|---|
| Année | `1ère`, `2ème`, `3ème`, `4ème`, `5ème` |
| Filière | `Alternance`, `Initial` |
| Rentrée | `Janvier`, `Septembre` |

---

## Canaux gérés par le bot

| Canal | Accès |
|---|---|
| `#règlement` | Tout le monde (lecture) — réaction ✅ retire le rôle `Temp` |
| `#inscription-bot` | Membres pré-inscrits uniquement |
| `#commands-bot` | Tous les membres inscrits |
| `#admin-commands-bot` | Gérants et adjoints uniquement |
| `#preuve` | Tous les inscrits (les externes ne peuvent pas poster) |
| `#présence` | Tous les inscrits (les externes ne peuvent ni poster ni utiliser les commandes) |
| `#rendu` | Admins uniquement |
| `#error-log` | Lecture admins — le bot y poste les erreurs automatiquement |

---

## Système de points

| Type | Source | Valeur |
|---|---|---|
| Preuve | Réaction ✅ d'un admin sur un message dans `#preuve` | 1 point par message unique |
| Présence | Validation de `/presence` par un admin | 1 point par séance |

### Points maximum par période

| Rôle | Maximum |
|---|---|
| ESGI | 4 |
| Externe | 4 |
| Adjoint | 6 |
| Gérant | 8 |

---

## Flux de présence

1. Un admin ouvre une séance (`/open-session` ou planifiée via `/schedule-session`).
2. L'utilisateur exécute `/presence`.
3. Une demande de validation apparaît dans `#admin-commands-bot` avec les boutons **Valider** / **Refuser**.
4. En cas de validation : 1 point ajouté, l'utilisateur reçoit un message privé.
5. La séance se ferme (`/close-session` ou automatiquement) — le nombre de présences est annoncé.
