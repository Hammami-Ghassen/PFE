# OTP Migration Summary and Current Architecture

## 1. Executive Summary
This project has been migrated from a classic email/password + JWT flow toward a legacy-compatible OTP authentication model centered on `MAT_PERS` with Redis-backed OTP storage.

The implementation now uses:
- `MAT_PERS` as login identifier (strict 8-digit varchar, leading zeros preserved)
- Legacy PostgreSQL quoted-uppercase tables (`"PERSONNEL"`, `"ADR_PERS"`, `"SOCIETE"`)
- Redis for ephemeral OTP hash storage with a 300-second TTL
- JWT-based stateless authorization and refresh token persistence (hashed)
- Server-side pagination for personnel search (`Pageable`, default size `50`)
- Admin APIs/UI for personnel search, role management, and establishment filtering sorted by `COD_SOC`
- Frontend 2-step OTP login flow with cookie-based refresh handling

## 2. What Was Implemented

### 2.1 Backend security/config foundations
- Added Redis dependency in `server/pom.xml`.
- Externalized sensitive and runtime settings via env placeholders in `server/src/main/resources/application.yml`.
- Added env templates:
  - `server/.env.example`
  - `client/.env.example`
- Added real local env files:
  - `server/.env`
  - `client/.env`
- Ensured `.env*` is ignored in `server/.gitignore`.
- Removed bootstrap admin seeding in `server/src/main/java/com/sante/app/SanteApplication.java` to comply with legacy DB constraints.

### 2.2 Legacy DB mappings and repositories
Added legacy-focused entities with strict quoted-uppercase mappings:
- `server/src/main/java/com/sante/app/model/legacy/Personnel.java`
- `server/src/main/java/com/sante/app/model/legacy/AdrPers.java`
- `server/src/main/java/com/sante/app/model/legacy/Societe.java`

Added refresh token persistence entity:
- `server/src/main/java/com/sante/app/model/auth/AuthRefreshToken.java`

Added repositories/projections:
- `server/src/main/java/com/sante/app/repository/PersonnelRepository.java`
- `server/src/main/java/com/sante/app/repository/AdrPersRepository.java`
- `server/src/main/java/com/sante/app/repository/SocieteRepository.java`
- `server/src/main/java/com/sante/app/repository/AuthRefreshTokenRepository.java`
- `server/src/main/java/com/sante/app/repository/projection/PersonnelAdminProjection.java`

### 2.3 OTP auth domain
Added request/response DTOs:
- `RequestOtpRequest`, `VerifyOtpRequest`, `OtpChannel`
- `UpdatePersonnelRoleRequest`
- `AuthProfileResponse`, `PersonnelAdminResponse`, `EstablishmentResponse`

Added role mapper service:
- `server/src/main/java/com/sante/app/service/LegacyRoleMapper.java`

Role mapping currently used:
- `ADMIN` -> `ADMIN`
- `DIRECTEUR` -> `DIRECTEUR`
- `AGENT` -> `EMPLOYEE`

Added OTP/auth core service:
- `server/src/main/java/com/sante/app/service/OtpAuthService.java`

Key behavior in `OtpAuthService`:
- OTP generation via CSPRNG (`SecureRandom`)
- OTP hash via SHA-256
- Redis key format: `otp:{MAT_PERS}`
- TTL: 300 seconds
- OTP key deleted immediately upon successful verification (anti-replay)
- Access token + refresh token issuance after OTP verification
- Refresh token hash persistence and rotation logic
- `GET /api/auth/me` profile enrichment with `firstName`, `lastName`, and `fullName`

### 2.4 Controllers and endpoints
Reworked auth controller to OTP/cookie-centric flow:
- `server/src/main/java/com/sante/app/controller/AuthController.java`

Endpoints:
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Added admin personnel controller:
- `server/src/main/java/com/sante/app/controller/LegacyAdminController.java`

Admin endpoints:
- `GET /api/admin/personnel` (search/filter + pageable metadata)
- `PATCH /api/admin/personnel/{matPers}/role`
- `GET /api/admin/personnel/establishments` (ordered by `COD_SOC` ascending)

### 2.5 JWT and security filter layer
Updated JWT property model:
- `server/src/main/java/com/sante/app/security/jwt/JwtProperties.java`

Updated token provider and filter:
- `server/src/main/java/com/sante/app/security/jwt/JwtTokenProvider.java`
- `server/src/main/java/com/sante/app/security/jwt/JwtAuthenticationFilter.java`

Security config adjusted to expose new auth endpoints:
- `server/src/main/java/com/sante/app/config/SecurityConfig.java`

### 2.6 Frontend refactor
Auth/session updates:
- `client/src/api/axios.js` (`withCredentials: true`)
- `client/src/services/authService.js`
- `client/src/hooks/useAxiosPrivate.js`
- `client/src/components/auth/PersistLogin.jsx`
- `client/src/context/AuthContext.jsx`
- Axios refresh flow hardened with queued retry after a single in-flight refresh call

Login flow replacement:
- `client/src/pages/auth/LoginPage.jsx`
- New 2-step flow (MAT_PERS + channel -> OTP verify)

Admin UI updates:
- `client/src/pages/admin/UsersListPage.jsx` (legacy personnel management)
- `client/src/pages/admin/AddEmployeePage.jsx` (UI-only mocked submit)
- `client/src/services/userService.js`
- `client/src/App.js` routing
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/layout/Header.jsx`
- `client/src/components/layout/DashboardLayout.jsx`
- `client/src/pages/dashboard/DashboardPage.jsx`
- `client/src/pages/dashboard/PowerBIDashboard.jsx` (new role-restricted BI placeholder)
- `client/src/components/ui/Badge.jsx`
- `client/src/utils/constants.js`

### 2.7 Operational/runtime fixes
- Added dedicated Redis unavailability handling in:
  - `server/src/main/java/com/sante/app/exception/GlobalExceptionHandler.java`
  - returns `503` with OTP service unavailable message
- Set `spring.jpa.open-in-view: false` to reduce JPA warning noise
- Added logger-level tuning for known non-blocking Spring Security warning

### 2.8 MAT_PERS strict format enforcement
`MAT_PERS` is now treated as **varchar with leading zeros preserved** (example: `00091651`, `00000001`).

Applied in:
- Backend DTO validation (`\d{8}`)
- Backend service normalization without numeric conversion
- Frontend input constraints (`maxLength=8`, digits-only)

### 2.9 Pagination, refresh, and navigation improvements
- `GET /api/admin/personnel` now defaults to `size=50` and still returns `Page<PersonnelAdminResponse>`.
- Frontend personnel list now uses compact page-window rendering based on backend `totalPages` to support large page counts without broken arrows.
- Users list data fetch now has in-flight request deduplication guards to prevent accidental client-side request storms.
- `/auth/me` now includes profile names from legacy `"PERSONNEL"` columns `"PREN_PERS"` and `"NOM_PERS"`.
- Refresh flow now guards against malformed legacy refresh-token rows (`MAT_PERS` / `EXPIRES_AT` null) and returns controlled unauthorized responses instead of internal server errors.
- Refresh JWT generation now includes a unique `jti` claim and persistence retries to avoid `TOKEN_HASH` unique-constraint collisions.
- Existing `/dashboard` section is labeled `Mes Informations`.
- New `Tableau de bord` page (`/powerbi-dashboard`) has a PowerBI placeholder and is visible/accessible only for `ADMIN` and `DIRECTEUR`.

## 3. Current Project Architecture

## 3.1 High-level structure
- `client/`: React SPA
- `server/`: Spring Boot API
- Root (`d:/PFE`): monorepo workspace container

## 3.2 Backend architecture (`server/`)
Layers:
1. `controller/`:
   - HTTP interface and endpoint contracts
2. `service/`:
   - business logic (OTP workflow, token lifecycle, role mapping)
3. `repository/`:
   - data access to legacy PostgreSQL and refresh token storage
4. `model/`:
   - JPA entities for legacy tables and auth token persistence
5. `security/`:
   - JWT generation/validation and security context filter
6. `exception/`:
   - centralized error translation to API responses

Security model:
- Stateless API security
- Access token in `Authorization: Bearer`
- Refresh token in secure cookie
- Role-based endpoint authorization

## 3.3 Frontend architecture (`client/`)
Layers:
1. `pages/`:
   - route-level features (login, dashboard, admin pages)
2. `components/`:
   - reusable UI and layout/auth guards
3. `services/`:
   - API adapters (`authService`, `userService`)
4. `hooks/`:
   - auth-aware Axios handling (`useAxiosPrivate`)
5. `context/`:
   - in-memory auth session state
6. `api/`:
   - Axios instances and defaults

Session behavior:
- access token kept in context
- refresh token handled via HttpOnly cookie
- refresh is attempted automatically on 401 via single-refresh queue, then failed requests are retried with the new bearer token

## 4. Main Components and Responsibilities

### 4.1 Backend components
- `AuthController`: entrypoint for OTP request/verify, refresh, logout, profile
- `OtpAuthService`: core OTP generation/validation + token issuing logic
- `LegacyAdminController`: admin-only personnel operations
- `LegacyAdminService`: search/filter/update role logic against legacy tables
- `JwtTokenProvider`: signing and parsing JWT tokens
- `JwtAuthenticationFilter`: populates Spring Security context from JWT
- `GlobalExceptionHandler`: consistent API error handling

### 4.2 Frontend components
- `LoginPage`: two-step OTP UX
- `PersistLogin`: restores session via refresh endpoint
- `useAxiosPrivate`: injects bearer token and retries after refresh
- `UsersListPage`: admin personnel list/search/filter/role update
- `AddEmployeePage`: UI-only employee creation form (mock submit)
- `Sidebar/Header`: role-aware navigation and identity display

## 5. Data Flow (End-to-End)

### 5.1 OTP request flow
1. User enters `MAT_PERS` + channel in frontend login step 1.
2. Frontend calls `POST /api/auth/request-otp`.
3. Backend validates `MAT_PERS` (`\d{8}`), loads personnel/contact from legacy tables.
4. Backend generates OTP (CSPRNG), hashes it, stores hash in Redis with 300s TTL.
5. Backend logs mock dispatch (currently no real SMTP/SMS provider wired).
6. Backend returns success response.

### 5.2 OTP verify/login flow
1. User enters OTP in step 2.
2. Frontend calls `POST /api/auth/verify-otp`.
3. Backend loads Redis hash for key `otp:{MAT_PERS}`.
4. Backend hashes incoming OTP and compares in constant-time style.
5. On success, backend deletes Redis key immediately.
6. Backend issues access token + refresh token.
7. Refresh token is written as secure cookie; access token returned in response body.
8. Frontend stores access token in auth context and calls `/api/auth/me` for profile.

### 5.3 Authenticated request flow
1. Frontend sends bearer access token via Axios interceptor.
2. Backend `JwtAuthenticationFilter` validates token and sets authorities.
3. Protected endpoints are authorized by role.
4. On token expiry/401, frontend calls refresh endpoint using cookie.
5. During concurrent 401 bursts, frontend performs one refresh request, queues failed requests, then retries them with the new access token.
6. User remains on the current page unless refresh fails definitively.

### 5.4 Admin personnel flow
1. Admin opens personnel page.
2. Frontend requests personnel list and establishments.
3. Backend queries legacy tables with search/filter (`MAT_PERS`, `COD_SOC`) and returns paged results (`content`, `totalPages`, `totalElements`, ...).
4. Establishment filter list is sorted by `COD_SOC` ascending.
5. Frontend renders list and allows role update (`COD_USER`).
6. Frontend pagination uses server metadata and supports deep navigation across many pages.
7. Role update endpoint writes new `COD_USER` in `"PERSONNEL"`.

### 5.5 Dashboard navigation and role guards
1. `/dashboard` is the authenticated user information page (`Mes Informations`).
2. `/powerbi-dashboard` is a dedicated BI dashboard placeholder route.
3. Sidebar shows `Tableau de bord` only for `ADMIN` and `DIRECTEUR`.
4. Route-level guard redirects `EMPLOYEE` users away from `/powerbi-dashboard`.

## 6. Current Known Limitations
1. OTP delivery is still mocked (log-based), not integrated with real SMTP/SMS gateways.
2. JWT key handling depends on correct RSA key material in env vars; invalid key format causes token generation failures.
3. Running backend currently requires proper Maven setup (wrapper files are not present in repository root server folder).
4. PowerBI integration is currently a UI placeholder pending embed URL/token/workspace configuration.

## 7. Recommended Next Steps
1. Integrate real OTP delivery providers (SMTP + SMS gateway abstraction).
2. Add startup fail-fast validation for JWT keys and Redis connectivity health checks.
3. Add integration tests for:
   - OTP request/verify/replay
   - refresh token rotation/revocation
   - admin personnel filtering and role update
4. Harden production profile values:
   - `JPA_DDL_AUTO=validate` (or `none`)
   - strict CORS origins
   - secure cookie flags and TLS-only deployment

## 8. Quick File Index (Most Important)
- Backend OTP/Auth:
  - `server/src/main/java/com/sante/app/controller/AuthController.java`
  - `server/src/main/java/com/sante/app/service/OtpAuthService.java`
  - `server/src/main/java/com/sante/app/security/jwt/JwtTokenProvider.java`
  - `server/src/main/java/com/sante/app/security/jwt/JwtAuthenticationFilter.java`
- Backend Admin Legacy:
  - `server/src/main/java/com/sante/app/controller/LegacyAdminController.java`
  - `server/src/main/java/com/sante/app/service/LegacyAdminService.java`
  - `server/src/main/java/com/sante/app/repository/PersonnelRepository.java`
   - `server/src/main/java/com/sante/app/repository/SocieteRepository.java`
- Frontend Auth/UI:
  - `client/src/pages/auth/LoginPage.jsx`
  - `client/src/hooks/useAxiosPrivate.js`
  - `client/src/components/auth/PersistLogin.jsx`
  - `client/src/pages/admin/UsersListPage.jsx`
  - `client/src/pages/admin/AddEmployeePage.jsx`
   - `client/src/components/auth/RoleRoute.jsx`
   - `client/src/pages/dashboard/PowerBIDashboard.jsx`

---
Generated as project root summary documentation for current migration status and architecture overview.
