# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GRH MSP — HR management system for the Tunisian Ministry of Public Health. Covers OTP authentication, leave management, personal info correction requests, and personnel administration. The codebase is in French (variable names, comments, UI labels).

## Architecture

- **`server/`** — Spring Boot 3.4 REST API (Java 23, Maven Wrapper)
- **`client/`** — React 19 SPA (Create React App + TailwindCSS 3)
- **`ETL_PFE/`** — ETL pipeline (separate concern)

# Refernce md
explore those files instead of exploring the codebase :
- PROJECT_ARCHITECTURE__SUMMARY.md
- README.md

## Build & Run Commands

### Backend

```bash
cd server
set -a; source .env; set +a     #load env variabes
./mvnw spring-boot:run          # Start server on :8080
./mvnw compile                  # Compile only
./mvnw test                     # Run all tests
./mvnw test -Dtest=ClassName    # Run a single test class
./mvnw test -Dtest=ClassName#methodName  # Run a single test method
```

Swagger UI: `http://localhost:8080/swagger-ui.html`

### Frontend

```bash
cd client
npm install        # Install dependencies
npm start          # Dev server on :3000
npm run build      # Production build
npm test           # Run tests
```

### Prerequisites

Java 23+, Node.js 18+, PostgreSQL 15+ (database `grh_msp`), Redis 7+ (OTP storage).

## Key Architecture Decisions

### Authentication Flow (OTP + JWT RS256)

No passwords — users authenticate via OTP sent by email/SMS. The flow is:
1. `POST /api/auth/request-otp` with `matPers` (employee ID) and `channel`
2. OTP stored in Redis with TTL
3. `POST /api/auth/verify-otp` returns an access token (JWT RS256, 15 min) in the body and a refresh token (7 days) as an HttpOnly/Secure/SameSite=Strict cookie
4. Access token is kept in React Context (memory only, not localStorage)
5. `useAxiosPrivate` hook auto-injects Bearer token and handles 401 refresh with a request queue to avoid concurrent refresh calls

### Roles

- `AGENT` — dashboard, leave requests, corrections
- `DIRECTEUR` — everything AGENT has + leave validation + Power BI
- `ADMIN` — user management, corrections review, Power BI

Server-side: `@PreAuthorize` method security. Client-side: `ProtectedRoute`, `RoleRoute`, `AdminRoute` components guard routes.

### API Response Envelope

All responses follow `{ success, message, data }`. Client accesses payload via `response.data.data`.

### Database

PostgreSQL with Hibernate `ddl-auto: update` for app tables. Legacy tables (`PERSONNEL`, `SOCIETE`, `DEM_CNG`, etc.) are pre-existing and must not be auto-generated.

### Environment Configuration

Backend: `server/.env` (DB, Redis, JWT keys, CORS). Frontend: `client/.env` (`REACT_APP_API_URL`, `REACT_APP_POWERBI_URL`). Copy from `.env.example` in each directory.
