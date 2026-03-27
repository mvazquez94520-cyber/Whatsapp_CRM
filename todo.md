# WhatsApp Manager - TODO

## Backend
- [x] Schéma de base de données (contacts, conversations, messages, relances, modèles)
- [x] API tRPC : gestion des contacts
- [x] API tRPC : gestion des conversations
- [x] API tRPC : gestion des messages
- [x] API tRPC : gestion des relances (CRUD + envoi immédiat)
- [x] API tRPC : modèles de messages
- [x] API tRPC : rapport / statistiques
- [x] Intégration whatsapp-web.js (QR code, envoi/réception de messages)
- [ ] WebSocket pour le QR code et les messages en temps réel
- [ ] Scheduler automatique pour les relances planifiées

## Frontend
- [x] Thème WhatsApp vert (palette OKLCH, police Inter)
- [x] Layout principal avec sidebar (DashboardLayout)
- [x] Page Connexion WhatsApp (QR code, statut, synchronisation)
- [x] Dashboard principal (statistiques, derniers messages, relances à venir)
- [x] Page Conversations (liste + détail messages + envoi)
- [x] Page Contacts (liste, recherche, édition, actions rapides)
- [x] Page Relances (créer, lister, filtrer par statut, envoi immédiat, planification)
- [x] Page Modèles de messages (CRUD, catégories, copie rapide)
- [x] Page Rapport (filtres date, graphique activité, export CSV messages + relances)

## Tests
- [x] Tests vitest (10 tests tRPC : contacts, conversations, messages, relances, modèles, stats)
- [x] Test auth.logout existant

## Finalisation
- [ ] Checkpoint final
