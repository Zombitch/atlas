# Cahier des Charges — Atlas

**Version :** v1.0  
**Date :** 28/02/2026

---

## 1) Présentation du projet

### 1.1 Nom
**Atlas**

### 1.2 Contexte
Atlas est une application web permettant de **créer des espaces de travail**, **uploader** et **organiser** des documents, **les consulter** (quand c’est possible) et **les partager** de manière sécurisée **sans création de compte**.

### 1.3 Objectifs
- Gérer des documents dans un espace de travail.
- Partager un espace ou un document via des **secrets** (propriétaire / partage).
- Proposer une interface **sobre, simple, rapide**, orientée efficacité.
- Assurer une sécurité forte malgré l’absence de comptes.

---

## 2) Périmètre

### 2.1 Inclus
- Création d’espaces de travail (workspaces).
- Upload de fichiers multi-formats.
- Consultation/visualisation (images, PDF, texte).
- Téléchargement sécurisé avec vérification de secret.
- Partage d’un espace ou d’un document via génération de secrets de partage.
- Gestion des secrets de partage (liste, régénération, suppression/révocation).

### 2.2 Exclu (hors scope)
- Comptes utilisateurs / email / mot de passe.
- Edition collaborative temps réel.
- Versioning avancé (historique complet des versions).
- OCR / indexation / recherche plein texte (option future).

---

## 3) Concepts & définitions

### 3.1 Workspace
Conteneur logique regroupant des documents.

### 3.2 Secrets
- **Secret propriétaire** : secret maître du workspace. Fourni **une seule fois** à la création. Donne les droits complets sur l’espace.
- **Secret de partage** : secret généré par un propriétaire pour accorder un accès limité à :
  - un **workspace entier**, ou
  - un **document spécifique**.

**Principe :** aucun compte, aucune identité classique. Le secret est l’identité et le moyen d’autorisation.

### 3.3 Ressource
Objet accessible : workspace, document (et dossiers si ajoutés plus tard).

---

## 4) Utilisateurs & rôles

### 4.1 Propriétaire (via secret propriétaire)
- Accès total au workspace :
  - upload
  - suppression / renommage / organisation
  - création, listing, régénération et révocation de secrets de partage
  - accès à toutes les ressources du workspace

### 4.2 Invité (via secret de partage)
- Accès uniquement aux ressources partagées (workspace ou document).
- Droits par défaut : **lecture / visualisation / téléchargement** (pas d’upload, pas de suppression).

---

## 5) Parcours utilisateur

### 5.1 Création d’un workspace
1. L’utilisateur clique sur “Créer un espace”.
2. Atlas crée le workspace et génère un **secret propriétaire**.
3. Atlas affiche le secret **une seule fois**, avec un avertissement clair :  
   “Copiez ce secret maintenant. Il ne pourra plus être affiché ensuite.”
4. L’utilisateur utilise ce secret pour accéder à son espace.

### 5.2 Accès via secret
- L’utilisateur saisit un secret sur la page d’accueil.
- Atlas vérifie le secret et ouvre :
  - le workspace en mode **propriétaire**, ou
  - la ressource partagée en mode **invité**.

### 5.3 Upload & gestion
- Upload via bouton (mobile) et drag & drop (desktop).
- Liste des documents avec actions :
  - visualiser
  - télécharger
  - partager (owner)
  - supprimer (owner)

### 5.4 Partage
- Le propriétaire choisit :
  - partager un **workspace** ou un **document**
- Atlas génère un **secret de partage** distinct.
- Le propriétaire copie ce secret et le transmet.

### 5.5 Téléchargement sécurisé
- Clic “Télécharger”
- Atlas demande un secret (champ adapté mobile)
- Vérifie : secret valide + autorisé pour la ressource
- Si OK : téléchargement proposé, sinon accès refusé

### 5.6 Visualisation
- Images : preview
- PDF : viewer intégré
- Texte : rendu brut (lisible, retour à la ligne)
- Binaire (zip, tar.gz, etc.) : téléchargement côté client (après contrôle)

---

## 6) Exigences fonctionnelles

### F1 — Création d’espace de travail
- Création d’un workspace par un utilisateur.
- Génération d’un **secret propriétaire** à la création.
- Le secret est affiché **une seule fois**.
- Le secret propriétaire donne accès total.

### F2 — Authentification sans compte
- Aucun compte / email / mot de passe.
- Toutes les autorisations reposent sur :
  - secret propriétaire
  - secret(s) de partage

### F3 — Upload de fichiers
- Upload autorisé pour :
  - toutes images
  - documents texte
  - PDF
  - tableurs
  - archives (zip, tar.gz, etc.)
  - autres formats (stockage générique)
- Taille max configurable via variables d’environnement.
- Support upload mobile (sélecteur natif) et desktop (drag & drop).

### F4 — Visualisation / preview
- Affichage intégré pour :
  - images, PDF, texte
- Si format non affichable :
  - téléchargement (après contrôle)

### F5 — Partage workspace / document
- Le propriétaire peut générer un secret de partage :
  - pour un workspace
  - ou un document
- Plusieurs secrets de partage possibles.
- Chaque secret de partage est révocable.

### F6 — Gestion des secrets de partage (owner)
- Si connecté avec secret propriétaire :
  - page listant tous les secrets de partage actifs/révoqués
  - possibilité :
    - de **régénérer** (nouveau secret, ancien invalidé)
    - de **révoquer/supprimer**

### F7 — Téléchargement contrôlé par secret
- Avant tout download :
  - demande de secret
  - vérification stricte du scope (workspace/document)
- Si secret non conforme : refus (403) sans fuite d’information.

### F8 — Interface sobre et simple
- Accès direct aux actions principales :
  - créer un espace
  - entrer un secret
  - upload
  - visualiser
  - télécharger
  - partager (owner)

---

## 7) Exigences non-fonctionnelles

### NF1 — Tech stack imposée
- Backend : **NestJS**
- Views : **EJS**
- Base de données : **MongoDB**
  - Collection **dev** : `atlas_file_dev`
  - Collection **prod** : `atlas_file_prod`
- Stockage fichiers : local ou S3-compatible (configurable)
- Configuration via variables d’environnement (`NODE_ENV`, `MONGODB_URI`, etc.)

### NF2 — Performance & UX
- Liste des fichiers : affichage fluide (objectif : < 1 seconde pour ~200 éléments).
- Upload avec indication de progression.
- Téléchargement en streaming (pas de chargement complet en mémoire).

### NF3 — Observabilité
- Logs structurés (accès, erreurs, actions sensibles).
- Journalisation des événements de sécurité :
  - tentatives de secrets invalides
  - création/révocation de partages

---

## 8) Sécurité (exigences critiques)

### S1 — Génération & stockage des secrets
- Secrets générés via CSPRNG (cryptographiquement sûr).
- Longueur minimale recommandée : **64 caractères base64url** (ou équivalent).
- **Aucun secret stocké en clair** en base :
  - stockage en hash (Argon2id recommandé, ou bcrypt)
  - comparaison sécurisée (résistante aux attaques timing)

### S2 — Contrôles d’accès systématiques
- Chaque action sensible doit vérifier :
  - validité du secret
  - type (owner/share)
  - scope (workspace/document)
  - droits associés

### S3 — Anti-énumération
- Identifiants non séquentiels (UUID v4 / ObjectId).
- Réponses neutres (“Accès refusé”) pour éviter la découverte d’IDs valides.

### S4 — Sécurisation des uploads
- Vérification taille, MIME, extension (ne pas faire confiance au client).
- Contrôle “magic bytes” si possible.
- Stockage hors répertoire exécutable.
- Servir les fichiers avec entêtes adaptés :
  - `Content-Disposition` selon le type
  - `X-Content-Type-Options: nosniff`

### S5 — Rate limiting
- Rate limit sur endpoints de vérification de secrets / download (anti brute-force).
- Blocage temporaire possible sur répétitions anormales.

### S6 — Sécurité Web (EJS + NestJS)
- Protection XSS : EJS escaping strict, pas d’injection HTML.
- CSP (Content Security Policy) adaptée.
- Validation serveur de toutes les entrées.
- Sanitization des noms de fichiers affichés.

---

## 9) Modèle de données (MongoDB — proposition)

### Stratégie MongoDB
- Toutes les données (workspaces, documents, partages) sont stockées dans MongoDB.
- Selon l’environnement :
  - `atlas_file_dev` en dev
  - `atlas_file_prod` en prod

> Note : MongoDB est généralement organisée en “database + collections”. Ici, la convention demandée est d’utiliser les collections `atlas_file_dev` et `atlas_file_prod` selon l’environnement.

### Entités

#### Workspace
- `_id`
- `name`
- `ownerSecretHash`
- `createdAt`

#### Document
- `_id`
- `workspaceId`
- `originalName`
- `storageName`
- `mimeType`
- `size`
- `createdAt`

#### ShareSecret
- `_id`
- `secretHash`
- `scopeType` : `WORKSPACE` | `DOCUMENT`
- `scopeId` : id du workspace ou du document
- `createdAt`
- `revokedAt` (nullable)

### Index recommandés
- `workspaceId` (pour les documents)
- `secretHash` (lookup rapide)
- `scopeType + scopeId`
- `revokedAt`

---

## 10) Vues & routes (proposition)

### Vues EJS
- `/` : accueil (créer workspace + entrer secret)
- `/workspace/:id` : liste documents (selon autorisation)
- `/doc/:id` : visualisation (si autorisé)
- `/shares` : gestion des secrets (owner uniquement)
- `/download/:id` : confirmation téléchargement (demande secret)

### Endpoints (exemple)
- `POST /api/workspaces` : créer workspace → retourne secret owner (une fois)
- `POST /api/access` : vérifier secret → retourne contexte d’accès
- `POST /api/upload` : upload fichier (owner)
- `POST /api/shares` : créer secret de partage (owner)
- `GET /api/shares` : lister secrets (owner)
- `DELETE /api/shares/:id` : révoquer (owner)
- `POST /api/download/verify` : valider secret + ressource
- `GET /api/download/:id` : download stream (après validation)

---

## 11) UX/UI — règles d’interface (mobile first)

### UI1 — Mobile first
- Conception prioritaire pour smartphone :
  - layout en colonne
  - boutons larges / zones tactiles confortables
  - navigation simple (peu d’écrans)
- Responsive obligatoire :
  - mobile (320–480 px)
  - tablette (768 px)
  - desktop (≥ 1024 px)

### UI2 — Lisibilité & efficacité
- Page d’accueil : deux actions évidentes
  - “Créer un espace”
  - “Entrer un secret”
- Liste documents : format “cartes” sur mobile, table possible sur desktop.
- Actions principales visibles immédiatement (upload / partager / télécharger).
- Champ secret adapté mobile :
  - bouton “coller”
  - option afficher/masquer
  - erreurs courtes, non techniques

### UI3 — Style
- Sobre, neutre, sans surcharge.
- Messages de sécurité clairs, sans jargon.

---

## 12) Tests & critères d’acceptation

### Critères d’acceptation (exemples)
- CA1 : la création d’un workspace génère un secret affiché une seule fois.
- CA2 : le secret propriétaire donne accès complet à l’espace.
- CA3 : un secret de partage donne accès uniquement à la ressource partagée.
- CA4 : un téléchargement sans secret valide est refusé (403).
- CA5 : l’owner peut lister, régénérer, révoquer des secrets.
- CA6 : preview fonctionne pour images/pdf/texte, sinon téléchargement.
- CA7 : UX mobile : toutes les pages clés sont utilisables à une main, sans zoom.

### Tests attendus
- Unit tests (guards, services secrets, permissions).
- E2E tests (création → upload → partage → accès invité → download).
- Tests sécurité (rate limit, anti-énumération, XSS basique, upload).
