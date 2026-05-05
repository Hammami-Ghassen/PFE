# GRH MSP - Systeme de Gestion des Ressources Humaines

Systeme de gestion RH pour le Ministere de la Sante Publique de Tunisie. L'application couvre l'authentification par OTP, la gestion des conges, les demandes de correction d'informations personnelles et l'administration du personnel.

## Architecture

```
PFE/
├── client/          React 19 SPA (CRA + TailwindCSS)
├── server/          Spring Boot 3.4 REST API (Java 23)
└── ETL_PFE/         Pipeline ETL (hors perimetre de ce README)
```

## Tech Stack

### Backend (`/server`)

| Couche | Technologie |
|---|---|
| Framework | Spring Boot 3.4.3, Java 23 |
| Securite | Spring Security 6 + JWT RS256 (jjwt 0.12) |
| ORM | Spring Data JPA / Hibernate (PostgreSQL) |
| Cache OTP | Spring Data Redis |
| Validation | Jakarta Bean Validation |
| API Docs | SpringDoc OpenAPI (Swagger UI) |
| Build | Maven Wrapper |

### Frontend (`/client`)

| Couche | Technologie |
|---|---|
| Framework | React 19.2 (Create React App) |
| Routing | React Router DOM 7.9 |
| HTTP | Axios 1.13 (intercepteurs JWT + refresh automatique) |
| CSS | TailwindCSS 3 (palette Ministere custom) |
| Icones | Heroicons React 2 |
| Notifications | React Hot Toast |
| Auth tokens | jwt-decode 4 |

### Infrastructure

| Service | Role |
|---|---|
| PostgreSQL | Base de donnees `grh_msp` (schema legacy PERSONNEL, DEM_CNG, etc.) |
| Redis | Stockage ephemere des codes OTP |

## Communication Client ↔ Serveur

### Base URL

Le client envoie toutes ses requetes vers `REACT_APP_API_URL` (par defaut `http://localhost:8080/api`). Le serveur expose ses endpoints sous `/api/**` et configure le CORS pour accepter l'origine du client.

### Authentification (OTP + JWT RS256)

```
Client                                     Serveur
  │                                           │
  │  POST /api/auth/request-otp               │
  │  { matPers, channel }                     │
  │ ─────────────────────────────────────────► │  Genere OTP → Redis (TTL)
  │                                           │  Envoie OTP par email/SMS
  │  POST /api/auth/verify-otp                │
  │  { matPers, otp }                         │
  │ ─────────────────────────────────────────► │  Verifie OTP
  │  ◄──────────────────────────────────────── │  accessToken (JWT body)
  │         Set-Cookie: refresh_token (HttpOnly) │  + refresh cookie
  │                                           │
  │  GET /api/auth/me                         │
  │  Authorization: Bearer <accessToken>      │
  │ ─────────────────────────────────────────► │
  │  ◄──────────────────────────────────────── │  Profil utilisateur
```

- **Access token** : JWT RS256, 15 min TTL, stocke en memoire (React Context).
- **Refresh token** : JWT RS256, 7 jours TTL, cookie `HttpOnly` / `Secure` / `SameSite=Strict`, scope `/api/auth`.
- Le hook `useAxiosPrivate` injecte le Bearer token sur chaque requete et relance automatiquement un refresh en cas de 401 (avec file d'attente pour eviter les appels concurrents).

### Roles et controle d'acces

| Role | Acces |
|---|---|
| `AGENT` | Dashboard, demandes de conge, corrections |
| `DIRECTEUR` | Tout AGENT + validation des conges + Power BI |
| `ADMIN` | Gestion des utilisateurs, corrections, Power BI |

Cote serveur, le controle se fait avec `@PreAuthorize` (method security). Cote client, les composants `ProtectedRoute`, `RoleRoute` et `AdminRoute` protegent les routes.

### Principaux endpoints

| Methode | Endpoint | Role(s) | Description |
|---|---|---|---|
| `POST` | `/api/auth/request-otp` | Public | Demander un OTP |
| `POST` | `/api/auth/verify-otp` | Public | Verifier OTP, obtenir tokens |
| `POST` | `/api/auth/refresh` | Public (cookie) | Renouveler l'access token |
| `GET` | `/api/auth/me` | Authentifie | Profil connecte |
| `POST` | `/api/auth/logout` | Authentifie | Deconnexion |
| `GET` | `/api/leaves/motifs` | AGENT, DIRECTEUR | Motifs de conge |
| `GET` | `/api/leaves/holidays` | AGENT, DIRECTEUR | Jours feries |
| `GET` | `/api/leaves/balance` | AGENT, DIRECTEUR | Solde de conge |
| `POST` | `/api/leaves` | AGENT, DIRECTEUR | Deposer une demande |
| `GET` | `/api/leaves/my` | AGENT, DIRECTEUR | Mes demandes |
| `GET` | `/api/leaves/validation` | DIRECTEUR | File de validation |
| `PATCH` | `/api/leaves/validation/{codSoc}/{matPers}/{numDcng}/review` | DIRECTEUR | Accepter/refuser |
| `POST` | `/api/corrections/request` | Authentifie | Demander une correction |
| `GET` | `/api/admin/corrections` | ADMIN | Lister les corrections |
| `PATCH` | `/api/admin/corrections/{id}/review` | ADMIN | Traiter une correction |
| `GET` | `/api/admin/personnel` | ADMIN | Rechercher le personnel |
| `PATCH` | `/api/admin/personnel/{matPers}/role` | ADMIN | Modifier un role |

### Format de reponse API

Toutes les reponses suivent le format :

```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

Le client accede aux donnees via `response.data.data`.

## Setup

### Prerequis

- Java 23+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. Base de donnees

Creer une base PostgreSQL `grh_msp`. Le DDL est gere par Hibernate (`ddl-auto: update`) pour les tables applicatives. Les tables legacy (`PERSONNEL`, `SOCIETE`, `DEM_CNG`, etc.) doivent exister au prealable.

### 2. Cles JWT

Generer une paire RSA et encoder en Base64 :

```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in private.pem -pubout -out public.pem

# PKCS8 private key → Base64
openssl pkcs8 -topk8 -inform PEM -outform DER -in private.pem -nocrypt | base64 -w 0

# X509 public key → Base64
openssl rsa -in private.pem -pubout -outform DER | base64 -w 0
```

### 3. Backend

```bash
cd server
cp .env.example .env
# Remplir les valeurs dans .env (DB, Redis, JWT keys, CORS)
set -a; source .env; set +a
./mvnw spring-boot:run
```

Le serveur demarre sur `http://localhost:8080`. Swagger UI est accessible a `http://localhost:8080/swagger-ui.html`.

### 4. Frontend

```bash
cd client
cp .env.example .env
npm install
npm start
```

Le client demarre sur `http://localhost:3000` et communique avec le backend sur le port 8080.

### Variables d'environnement

#### Backend (`server/.env`)

| Variable | Defaut | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | Port du serveur |
| `DB_URL` | `jdbc:postgresql://localhost:5432/grh_msp` | URL JDBC |
| `DB_USERNAME` | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `change_me` | Mot de passe PostgreSQL |
| `REDIS_HOST` | `localhost` | Hote Redis |
| `REDIS_PORT` | `6379` | Port Redis |
| `JWT_PRIVATE_KEY` | - | Cle privee RSA (Base64 PKCS8) |
| `JWT_PUBLIC_KEY` | - | Cle publique RSA (Base64 X509) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Origines CORS autorisees |

#### Frontend (`client/.env`)

| Variable | Defaut | Description |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8080/api` | URL de l'API backend |
| `REACT_APP_POWERBI_URL` | - | URL d'embed Power BI |
