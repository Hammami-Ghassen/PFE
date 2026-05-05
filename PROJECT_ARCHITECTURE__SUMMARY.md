# OTP Migration Summary and Current Architecture

## 1. Executive Summary
This project has been migrated from a classic email/password + JWT flow toward OTP authentication model centered on `MAT_PERS` with Redis-backed OTP storage.

The implementation now uses:
- `MAT_PERS` as login identifier (strict 8-digit varchar, leading zeros preserved)
- PostgreSQL quoted-uppercase tables (`"PERSONNEL"`, `"ADR_PERS"`, `"SOCIETE"`)
- Redis for ephemeral OTP hash storage with a 300-second TTL
- JWT-based stateless authorization and refresh token persistence (hashed)
- Server-side pagination for personnel search (`Pageable`, default size `50`)
- Admin APIs/UI for personnel search, role management, and establishment filtering sorted by `COD_SOC`
- Frontend 2-step OTP login flow with cookie-based refresh handling
- Role-based leave workflow (`AGENT`/`DIRECTEUR`) with submission, personal tracking, and director validation
- Correction request workflow with attachment upload and admin review/download actions
- Updated dashboard shell and UI component set (`StatCard`, `ProfileHeader`, `LeaveBalanceCard`)

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
- Ensured `.env` is ignored in `server/.gitignore`.

### 2.2 DB mappings and repositories
Added entities with strict quoted-uppercase mappings:
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

Current role model:
- Role values are consumed directly from database `COD_USER` (`ADMIN`, `DIRECTEUR`, `AGENT`)
- No role-mapper layer and no `EMPLOYEE` translation in backend flow
- `AuthProfileResponse` exposes `role` only (no duplicated `codUser` field)


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
- `GET /api/auth/me` profile enrichment with `firstName`, `lastName`, `fullName`, `adresse`, `service`, `grade`, and `posteTravail`

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
- `server/src/main/java/com/sante/app/controller/AdminController.java`

Admin endpoints:
- `GET /api/admin/personnel` (search/filter + pageable metadata)
- `PATCH /api/admin/personnel/{matPers}/role`
- `GET /api/admin/personnel/establishments` (ordered by `COD_SOC` ascending)

Additional business controllers:
- `server/src/main/java/com/sante/app/controller/LeaveController.java`
- `server/src/main/java/com/sante/app/controller/LeaveBalanceController.java`
- `server/src/main/java/com/sante/app/controller/LeaveValidationController.java`
- `server/src/main/java/com/sante/app/controller/CorrectionController.java`
- `server/src/main/java/com/sante/app/controller/AdminCorrectionController.java`

Additional endpoints:
- `GET /api/leaves/motifs`
- `POST /api/leaves`
- `GET /api/leaves/my`
- `GET /api/leaves/validation`
- `PATCH /api/leaves/validation/{codSoc}/{matPers}/{numDcng}/review`
- `POST /api/corrections/request` (multipart)
- `GET /api/admin/corrections`
- `PATCH /api/admin/corrections/{id}/review`
- `GET /api/admin/corrections/{id}/attachment`

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
- `client/src/pages/admin/UsersListPage.jsx` (personnel management)
- `client/src/pages/admin/AddEmployeePage.jsx` (UI-only mocked submit)
- `client/src/pages/admin/CorrectionRequestsPage.jsx` (admin correction queue/review)
- `client/src/services/userService.js`
- `client/src/App.js` routing
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/layout/Header.jsx`
- `client/src/components/layout/DashboardLayout.jsx`
- `client/src/pages/dashboard/DashboardPage.jsx`
- `client/src/pages/dashboard/PowerBIDashboard.jsx` (role-restricted embedded BI iframe)
- `client/src/components/ui/Badge.jsx`
- `client/src/components/ui/StatCard.jsx`
- `client/src/components/ui/ProfileHeader.jsx`
- `client/src/components/ui/LeaveBalanceCard.jsx`
- `client/src/utils/constants.js`

Leave and correction UI updates:
- `client/src/pages/leave/MyLeaveRequestsPage.jsx` (leave request form integrated/refactored)
- `client/src/components/leave/LeaveValidationDetailModal.jsx`
- `client/src/pages/leave/LeaveValidationPage.jsx`
- `client/src/services/leaveService.js`
- `client/src/services/correctionService.js`

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
- `/auth/me` now includes profile names from `"PERSONNEL"` columns `"PREN_PERS"` and `"NOM_PERS"`.
- Refresh flow now guards against malformed legacy refresh-token rows (`MAT_PERS` / `EXPIRES_AT` null) and returns controlled unauthorized responses instead of internal server errors.
- Refresh JWT generation now includes a unique `jti` claim and persistence retries to avoid `TOKEN_HASH` unique-constraint collisions.
- Authentication and profile response now use `COD_USER` directly as `role` (no mapper/translation and no `codUser` duplication in profile payload).
- Existing `/dashboard` section is labeled `Mes Informations`.
- `Tableau de bord` page (`/powerbi-dashboard`) is visible/accessible only for `ADMIN` and `DIRECTEUR` and now renders an embedded PowerBI iframe.

### 2.10 Profile enrichment (legacy SQL joins)
- `/api/auth/me` now uses a dedicated native projection query in `PersonnelRepository` (no JPA relations added on entities).
- Query joins legacy tables with quoted uppercase identifiers: `"PERSONNEL"`, `"ADR_PERS"`, `"DELEGATION"`, `"GOUVERNORAT"`, `"SERVICE"`, `"POSTE_TRAV"`, `"GRADE"`, and `"SOCIETE"`.
- Address format is computed from joined fields as: `{RUE}, {LIB_DELEG}, {LIB_GOUV}` with null/blank-safe concatenation.
- Service label is now hierarchical:
   - if `SER_COD_SERV` is null: show current service only (`LIB_SERV`)
   - else: show `{sous_service}, {service_mere}` using self-join on `"SERVICE"` (`COD_SERV` -> `SER_COD_SERV`).
- `POSTE_TRAV` join was aligned to legacy table name `"POSTE_TRAV"` and key `COD_POST`.

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
   - business logic (OTP workflow, token lifecycle, profile enrichment, direct role usage from `COD_USER`)
3. `repository/`:
   - data access to PostgreSQL and refresh token storage
4. `model/`:
   - JPA entities for legacy tables and auth token persistence
5. `security/`:
   - JWT generation/validation and security context filter
6. `exception/`:
   - centralized error translation to API responses
7. `config/`:
   - CORS, OpenAPI and Spring Security wiring

Security model:
- Stateless API security
- Access token in `Authorization: Bearer`
- Refresh token in secure cookie
- Role-based endpoint authorization

## 3.3 Frontend architecture (`client/`)
Layers:
1. `pages/`:
   - route-level features (login, dashboard, leave, admin pages)
2. `components/`:
   - reusable UI and layout/auth guards
3. `services/`:
   - API adapters (`authService`, `userService`, `leaveService`, `correctionService`)
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

## 3.4 Detailed module map

### Backend file map (`server/src/main/java/com/sante/app`)
- Bootstrap:
   - `SanteApplication.java`
- Config:
   - `config/CorsConfig.java`
   - `config/OpenApiConfig.java`
   - `config/SecurityConfig.java`
- Controllers:
   - `controller/AuthController.java`
   - `controller/AdminController.java`
   - `controller/LeaveController.java`
   - `controller/LeaveBalanceController.java`
   - `controller/LeaveValidationController.java`
   - `controller/CorrectionController.java`
   - `controller/AdminCorrectionController.java`
- DTO request:
   - `dto/request/CreateLeaveRequest.java`
   - `dto/request/ReviewLeaveRequest.java`
   - `dto/request/ReviewCorrectionRequest.java`
   - `dto/request/OtpChannel.java`
   - `dto/request/RequestOtpRequest.java`
   - `dto/request/VerifyOtpRequest.java`
   - `dto/request/UpdatePersonnelRoleRequest.java`
- DTO response:
   - `dto/response/ApiResponse.java`
   - `dto/response/AuthResponse.java`
   - `dto/response/AuthProfileResponse.java`
   - `dto/response/PersonnelAdminResponse.java`
   - `dto/response/EstablishmentResponse.java`
   - `dto/response/LeaveMotifResponse.java`
   - `dto/response/LeaveRequestResponse.java`
   - `dto/response/LeaveBalanceResponse.java`
   - `dto/response/LeaveHolidayResponse.java`
   - `dto/response/LeaveValidationResponse.java`
   - `dto/response/CorrectionRequestResponse.java`
   - `dto/response/AdminCorrectionRequestResponse.java`
   - `dto/response/CorrectionAttachmentResponse.java`
- Models:
   - `model/legacy/Personnel.java`
   - `model/legacy/AdrPers.java`
   - `model/legacy/Societe.java`
   - `model/auth/AuthRefreshToken.java`
   - `model/leave/MotifJ.java`
   - `model/leave/DemCng.java`
   - `model/leave/DemCngId.java`
   - `model/leave/LeaveValidationStatus.java`
   - `model/leave/JoursFeriers.java`
   - `model/correction/DemandeCorrectionInfo.java`
   - `model/correction/CorrectionTargetAttribute.java`
   - `model/correction/CorrectionRequestStatus.java`
- Repositories:
   - `repository/PersonnelRepository.java`
   - `repository/AdrPersRepository.java`
   - `repository/SocieteRepository.java`
   - `repository/AuthRefreshTokenRepository.java`
   - `repository/MotifJRepository.java`
   - `repository/DemCngRepository.java`
   - `repository/JoursFeriersRepository.java`
   - `repository/DemandeCorrectionInfoRepository.java`
   - `repository/projection/PersonnelAdminProjection.java`
   - `repository/projection/ProfileProjection.java`
   - `repository/projection/MyLeaveRequestProjection.java`
   - `repository/projection/LeaveValidationProjection.java`
   - `repository/projection/CorrectionAdminProjection.java`
- Services:
   - `service/OtpAuthService.java`
   - `service/AuthTokenService.java`
   - `service/OtpStoreService.java`
   - `service/AdminService.java`
   - `service/LeaveService.java`
   - `service/CorrectionService.java`
- Security:
   - `security/AuthEntryPoint.java`
   - `security/jwt/JwtAuthenticationFilter.java`
   - `security/jwt/JwtProperties.java`
   - `security/jwt/JwtTokenProvider.java`
- Exception handling:
   - `exception/BadRequestException.java`
   - `exception/UnauthorizedException.java`
   - `exception/ResourceNotFoundException.java`
   - `exception/GlobalExceptionHandler.java`

### Frontend file map (`client/src`)
- Entry:
   - `index.js`
   - `App.js`
   - `index.css`
- API:
   - `api/axios.js`
   - `api/axiosRetryQueue.js`
   - `api/axiosRetryQueue.test.js`
- Context:
   - `context/AuthContext.jsx`
- Hooks:
   - `hooks/useAuth.js`
   - `hooks/useAxiosPrivate.js`
   - `hooks/useEstablishments.js`
   - `hooks/usePersonnelPagination.js`
   - `hooks/usePersonnelPagination.test.js`
- Auth components:
   - `components/auth/PersistLogin.jsx`
   - `components/auth/ProtectedRoute.jsx`
   - `components/auth/GuardedRoute.jsx`
   - `components/auth/AdminRoute.jsx`
   - `components/auth/RoleRoute.jsx`
   - `components/auth/LoginMatPersStep.jsx`
   - `components/auth/LoginOtpStep.jsx`
- Layout:
   - `components/layout/DashboardLayout.jsx`
   - `components/layout/Header.jsx`
   - `components/layout/Sidebar.jsx`
   - `components/layout/Logo.jsx`
- UI components:
   - `components/ui/Alert.jsx`
   - `components/ui/Badge.jsx`
   - `components/ui/Button.jsx`
   - `components/ui/Card.jsx`
   - `components/ui/Input.jsx`
   - `components/ui/Modal.jsx`
   - `components/ui/Spinner.jsx`
   - `components/ui/StatCard.jsx`
   - `components/ui/ProfileHeader.jsx`
   - `components/ui/LeaveBalanceCard.jsx`
   - `components/leave/LeaveValidationDetailModal.jsx`
- Pages:
   - `pages/auth/LoginPage.jsx`
   - `pages/dashboard/DashboardPage.jsx`
   - `pages/dashboard/PowerBIDashboard.jsx`
   - `pages/admin/UsersListPage.jsx`
   - `pages/admin/AddEmployeePage.jsx`
   - `pages/admin/CorrectionRequestsPage.jsx`
   - `pages/leave/MyLeaveRequestsPage.jsx`
   - `pages/leave/LeaveValidationPage.jsx`
- Services and utils:
   - `services/authService.js`
   - `services/userService.js`
   - `services/addEmployeeMockService.js`
   - `services/leaveService.js`
   - `services/correctionService.js`
   - `utils/constants.js`
   - `utils/helpers.js`

## 4. Main Components and Responsibilities

### 4.1 Backend components
- `AuthController`: entrypoint for OTP request/verify, refresh, logout, profile
- `OtpAuthService`: core OTP generation/validation + token issuing + profile hydration/mapping
- `AdminController`: admin-only personnel operations
- `AdminService`: search/filter/update role logic
- `LeaveController`: leave motifs, leave request creation, and personal leave history APIs
- `LeaveValidationController`: director queue and approve/reject actions for leave workflow
- `LeaveService`: leave business rules, pagination, status transitions, and reviewer updates
- `CorrectionController`: employee correction submission with attachment upload
- `AdminCorrectionController`: admin correction review queue + attachment download
- `CorrectionService`: correction persistence, attachment retrieval, and review state transitions
- `AuthTokenService`: access/refresh token generation, hashing, persistence and revocation
- `OtpStoreService`: Redis-backed OTP hash storage (`otp:{MAT_PERS}` + TTL)
- `PersonnelRepository`: native SQL search/update/profile projection including legacy joins for profile enrichment
- `JwtTokenProvider`: signing and parsing JWT tokens
- `JwtAuthenticationFilter`: populates Spring Security context from JWT
- `GlobalExceptionHandler`: consistent API error handling

### 4.2 Frontend components
- `LoginPage`: two-step OTP UX
- `PersistLogin`: restores session via refresh endpoint
- `useAxiosPrivate`: injects bearer token and retries after refresh
- `UsersListPage`: admin personnel list/search/filter/role update
- `AddEmployeePage`: UI-only employee creation form (mock submit)
- `CorrectionRequestsPage`: admin moderation UI for correction requests and attachments
- `MyLeaveRequestsPage`: authenticated employee leave history and new leave submission form
- `LeaveValidationPage`: director leave validation queue
- `LeaveValidationDetailModal`: review detailed info before taking action
- `DashboardPage`: authenticated profile view (`Mes Informations`) including enriched fields (`adresse`, `service`, `grade`, `posteTravail`)
- `Sidebar/Header`: role-aware navigation and identity display
- `StatCard`, `ProfileHeader`, `LeaveBalanceCard`: new dashboard-oriented UI building blocks

## 5. Data Flow (End-to-End)

### 5.1 OTP request flow
1. User enters `MAT_PERS` + channel in frontend login step 1.
2. Frontend calls `POST /api/auth/request-otp`.
3. Backend validates `MAT_PERS` (`\d{8}`), then loads personnel and contact data.
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

### 5.6 Profile data hydration flow (`/api/auth/me`)
1. Frontend calls `GET /api/auth/me` with bearer access token.
2. Backend resolves `MAT_PERS` from JWT principal.
3. Repository executes one native SQL query with LEFT JOINs across personnel, address, delegation, gouvernorat, service (including parent service), poste, grade, and societe.
4. Service layer formats `adresse` and normalizes empty values to `null`.
5. API returns enriched profile payload consumed by `DashboardPage` (`Mes Informations`).

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
3. Backend queries tables with search/filter (`MAT_PERS`, `COD_SOC`) and returns paged results (`content`, `totalPages`, `totalElements`, ...).
4. Establishment filter list is sorted by `COD_SOC` ascending.
5. Frontend renders list and allows role update (`COD_USER`).
6. Frontend pagination uses server metadata and supports deep navigation across many pages.
7. Role update endpoint writes new `COD_USER` in `"PERSONNEL"`.

### 5.5 Dashboard navigation and role guards
1. `/dashboard` is the authenticated user information page (`Mes Informations`).
2. `/powerbi-dashboard` is a dedicated BI dashboard route using an embedded PowerBI iframe.
3. Sidebar shows `Tableau de bord` only for `ADMIN` and `DIRECTEUR`.
4. Route-level guard redirects `AGENT` users away from `/powerbi-dashboard`.

### 5.7 Leave submission and validation flow
1. `AGENT` or `DIRECTEUR` user opens leave submission page and loads motifs from `GET /api/leaves/motifs`.
2. User submits leave request through `POST /api/leaves`.
3. User tracks personal requests through `GET /api/leaves/my`.
4. `DIRECTEUR` accesses validation queue through `GET /api/leaves/validation`.
5. Reviewer accepts/rejects request through `PATCH /api/leaves/validation/{codSoc}/{matPers}/{numDcng}/review`.

### 5.8 Correction request and admin review flow
1. Authenticated user submits correction + attachment via multipart `POST /api/corrections/request`.
2. `ADMIN` lists requests with pagination and optional status filtering via `GET /api/admin/corrections`.
3. `ADMIN` downloads evidence files through `GET /api/admin/corrections/{id}/attachment`.
4. `ADMIN` applies review decision through `PATCH /api/admin/corrections/{id}/review`.

## 6. Current Known Limitations
1. OTP delivery is still mocked (log-based), not integrated with real SMTP/SMS gateways.
2. JWT key handling depends on correct RSA key material in env vars; invalid key format causes token generation failures.
3. Running backend requires valid runtime dependencies/configuration (PostgreSQL legacy schema, Redis, JWT key material, and environment variables).
4. PowerBI view currently relies on a static embedded iframe URL and still needs production-grade embed governance (workspace ownership, token strategy, and lifecycle management).
5. Add-employee page remains UI-only; backend insertion workflow is intentionally not wired yet.

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

## 8. Key File Index (Complete Application Scope)

### 8.1 Backend (`server/`)
- Runtime and config:
   - `server/pom.xml`
   - `server/src/main/resources/application.yml`
   - `server/src/main/java/com/sante/app/SanteApplication.java`
   - `server/src/main/java/com/sante/app/config/SecurityConfig.java`
   - `server/src/main/java/com/sante/app/config/CorsConfig.java`
   - `server/src/main/java/com/sante/app/config/OpenApiConfig.java`
- Auth/profile APIs:
   - `server/src/main/java/com/sante/app/controller/AuthController.java`
   - `server/src/main/java/com/sante/app/service/OtpAuthService.java`
   - `server/src/main/java/com/sante/app/service/AuthTokenService.java`
   - `server/src/main/java/com/sante/app/service/OtpStoreService.java`
   - `server/src/main/java/com/sante/app/repository/PersonnelRepository.java`
   - `server/src/main/java/com/sante/app/repository/projection/ProfileProjection.java`
- Leave APIs:
   - `server/src/main/java/com/sante/app/controller/LeaveController.java`
   - `server/src/main/java/com/sante/app/controller/LeaveBalanceController.java`
   - `server/src/main/java/com/sante/app/controller/LeaveValidationController.java`
   - `server/src/main/java/com/sante/app/service/LeaveService.java`
   - `server/src/main/java/com/sante/app/repository/DemCngRepository.java`
   - `server/src/main/java/com/sante/app/repository/MotifJRepository.java`
   - `server/src/main/java/com/sante/app/repository/JoursFeriersRepository.java`
- Correction APIs:
   - `server/src/main/java/com/sante/app/controller/CorrectionController.java`
   - `server/src/main/java/com/sante/app/controller/AdminCorrectionController.java`
   - `server/src/main/java/com/sante/app/service/CorrectionService.java`
   - `server/src/main/java/com/sante/app/repository/DemandeCorrectionInfoRepository.java`
- Admin APIs:
   - `server/src/main/java/com/sante/app/controller/AdminController.java`
   - `server/src/main/java/com/sante/app/service/AdminService.java`
   - `server/src/main/java/com/sante/app/repository/projection/PersonnelAdminProjection.java`
   - `server/src/main/java/com/sante/app/repository/SocieteRepository.java`
- Security and tokens:
   - `server/src/main/java/com/sante/app/security/AuthEntryPoint.java`
   - `server/src/main/java/com/sante/app/security/jwt/JwtTokenProvider.java`
   - `server/src/main/java/com/sante/app/security/jwt/JwtAuthenticationFilter.java`
   - `server/src/main/java/com/sante/app/security/jwt/JwtProperties.java`
   - `server/src/main/java/com/sante/app/model/auth/AuthRefreshToken.java`
   - `server/src/main/java/com/sante/app/repository/AuthRefreshTokenRepository.java`
- Legacy entities and exceptions:
   - `server/src/main/java/com/sante/app/model/legacy/Personnel.java`
   - `server/src/main/java/com/sante/app/model/legacy/AdrPers.java`
   - `server/src/main/java/com/sante/app/model/legacy/Societe.java`
   - `server/src/main/java/com/sante/app/exception/GlobalExceptionHandler.java`
   - `server/src/main/java/com/sante/app/exception/BadRequestException.java`
   - `server/src/main/java/com/sante/app/exception/UnauthorizedException.java`
   - `server/src/main/java/com/sante/app/exception/ResourceNotFoundException.java`

### 8.2 Frontend (`client/`)
- Runtime and build:
   - `client/package.json`
   - `client/tailwind.config.js`
   - `client/postcss.config.js`
   - `client/public/index.html`
   - `client/src/index.js`
   - `client/src/App.js`
- Auth/session flow:
   - `client/src/services/authService.js`
   - `client/src/context/AuthContext.jsx`
   - `client/src/components/auth/PersistLogin.jsx`
   - `client/src/hooks/useAxiosPrivate.js`
   - `client/src/api/axios.js`
   - `client/src/api/axiosRetryQueue.js`
- Routing, guards, layout:
   - `client/src/components/auth/ProtectedRoute.jsx`
   - `client/src/components/auth/GuardedRoute.jsx`
   - `client/src/components/auth/AdminRoute.jsx`
   - `client/src/components/auth/RoleRoute.jsx`
   - `client/src/components/layout/DashboardLayout.jsx`
   - `client/src/components/layout/Header.jsx`
   - `client/src/components/layout/Sidebar.jsx`
- Pages and features:
   - `client/src/pages/auth/LoginPage.jsx`
   - `client/src/pages/dashboard/DashboardPage.jsx`
   - `client/src/pages/dashboard/PowerBIDashboard.jsx`
   - `client/src/pages/admin/UsersListPage.jsx`
   - `client/src/pages/admin/AddEmployeePage.jsx`
   - `client/src/pages/admin/CorrectionRequestsPage.jsx`
   - `client/src/pages/leave/MyLeaveRequestsPage.jsx`
   - `client/src/pages/leave/LeaveValidationPage.jsx`
   - `client/src/components/leave/LeaveValidationDetailModal.jsx`
   - `client/src/services/userService.js`
   - `client/src/services/addEmployeeMockService.js`
   - `client/src/services/leaveService.js`
   - `client/src/services/correctionService.js`
   - `client/src/hooks/usePersonnelPagination.js`
   - `client/src/hooks/useEstablishments.js`
- Shared UI and utilities:
   - `client/src/components/ui/Alert.jsx`
   - `client/src/components/ui/Badge.jsx`
   - `client/src/components/ui/Button.jsx`
   - `client/src/components/ui/Card.jsx`
   - `client/src/components/ui/Input.jsx`
   - `client/src/components/ui/Modal.jsx`
   - `client/src/components/ui/Spinner.jsx`
   - `client/src/components/ui/StatCard.jsx`
   - `client/src/components/ui/ProfileHeader.jsx`
   - `client/src/components/ui/LeaveBalanceCard.jsx`
   - `client/src/utils/constants.js`
   - `client/src/utils/helpers.js`

### 8.3 Automated tests currently present
- Backend:
   - `server/src/test/java/com/sante/app/controller/AuthControllerTest.java`
   - `server/src/test/java/com/sante/app/service/OtpAuthServiceTest.java`
   - `server/src/test/java/com/sante/app/service/LeaveServiceTest.java`
- Frontend:
   - `client/src/api/axiosRetryQueue.test.js`
   - `client/src/hooks/usePersonnelPagination.test.js`

---
Generated as project root summary documentation for current migration status and architecture overview.
