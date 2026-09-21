# HoneyShield Security Architecture & Threat Model

*Document Version: 2.1.0 — Current State as of September 2026*

This document provides the authoritative, single source of truth regarding HoneyShield's authentication model, authorization boundaries, rate limiting, audit logging, and cryptographic data protection.

---

## 1. Authentication Architecture

### 1.1 Dedicated Administrative Login
- **Endpoint**: `POST /api/auth/admin-login`
- **Controller**: `backend/routes/auth.js`
- **Mechanism**:
  - The submitted username is compared strictly against `process.env.ADMIN_USERNAME`.
  - The submitted password is verified using `bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)`.
  - **Invariants**:
    - There is **no plaintext password** comparison anywhere in the codebase.
    - There are **no static fallbacks** (e.g. `admin123` or `admin` defaults).
    - If `ADMIN_PASSWORD_HASH` is unset or empty in the environment, the server immediately halts execution on boot (`process.exit(1)`).
- **Session Tokens**:
  - Successful authentication issues a cryptographically secure 32-byte hex token (`crypto.randomBytes(32).toString('hex')`).
  - Sessions are cached in Redis / Memory cache under `admin:session:${token}` with an 8-hour TTL.
  - Revocation is handled via `POST /api/auth/admin-logout`.

### 1.2 Rate Limiting on Admin Login
- **Limiter**: Dedicated Express rate limiter (`adminLoginLimiter` in `backend/routes/auth.js`).
- **Policy**: Exactly **5 attempts per 15 minutes per client IP**.
- **Enforcement**: On the 6th attempt within the 15-minute sliding window, the server immediately returns **HTTP 429 Too Many Requests** *before* checking any credentials or querying bcrypt.

### 1.3 Audit Logging of Failed Admin Logins
- Every failed administrative login attempt (whether caused by an unrecognized username or invalid password) writes a document directly to MongoDB (`AuditLog` collection):
  - `action`: `'FAILED_ADMIN_LOGIN'`
  - `target`: Attempted username
  - `targetType`: `'USER'`
  - `details`: `{ attemptedUsername, ip, reason, timestamp }`
  - `timestamp`: Standard `Date.now`

---

## 2. Authorization & Protected Boundaries

### 2.1 Middleware: `requireAdmin`
- **Location**: `backend/middleware/auth.js`
- **Validation**:
  - Checks incoming `Authorization: Bearer <token>` header against `admin:session:<token>` in the cache.
  - Attaches `req.admin = { username, ip, sessionId }` on success.
  - Rejects unauthenticated or invalid requests with **HTTP 401 Unauthorized**.
- **Strict Invariant**:
  - **Zero header-based bypasses**: All legacy bypass mechanisms (such as `x-admin-key`) and static fallback secrets have been completely and permanently removed.

### 2.2 Complete Endpoint Inventory & Authorization Matrix

#### Protected Routes (requireAdmin: Bearer token required, 401 on missing/invalid token):
- **Data Vault (`/api/vault`)** — *100% Gated at top-level in `server.js`*:
  - `GET /api/vault` — returns decrypted evidence data for admin view
  - `GET /api/vault/export` — JSON evidence export
  - `GET /api/vault/session/:sessionId` — single session evidence
  - `GET /api/vault/session/:sessionId/export` — single session export
- **Data Export (`/api/export`)** — *100% Gated at top-level in `server.js`*:
  - `GET /api/export/attacks`, `/sessions`, `/honey`, `/alerts`
- **SOC Alerts (`/api/alerts`)** — *100% Gated at top-level in `server.js`*:
  - `GET /api/alerts`, `POST /api/alerts`, `PUT /api/alerts/:id`
- **Threat Analytics (`/api/analytics`)** — *100% Gated at top-level in `server.js`*:
  - `GET /api/analytics/overview`, `/timeline`, `/geo`, `/attack-types`, etc.
- **AI Threat Intelligence (`/api/ai`)** — *100% Gated at top-level in `server.js`*:
  - `GET /api/ai/health`, `POST /api/ai/predict/:sessionId`
- **Blocklist & Containment Management (`/api/blocklist`)**:
  - `GET /api/blocklist` — View all blocked IPs (`requireAdmin` — closes reconnaissance oracle)
  - `GET /api/blocklist/fingerprints` — View all blocked fingerprints (`requireAdmin` — closes reconnaissance oracle)
  - `POST /api/blocklist` — Manual IP block (`requireAdmin`)
  - `DELETE /api/blocklist/:ip` — Manual IP unblock + conditional VPN exemption (`requireAdmin`)
  - `POST /api/blocklist/fingerprint` — Manual device fingerprint block (`requireAdmin`)
  - `DELETE /api/blocklist/fingerprint/:fp` — Manual fingerprint unblock (`requireAdmin`)
  - `POST /api/blocklist/unblock-client` — Combined IP + fingerprint release (`requireAdmin`)
  - `GET /api/blocklist/exemptions` — View active 24h VPN exemptions (`requireAdmin`)
  - `DELETE /api/blocklist/exemptions/:ip` — Revoke active 24h VPN exemption (`requireAdmin`)
  - `GET /api/blocklist/audit-logs` — Audit trail records (`requireAdmin`)
  - `GET /api/blocklist/check/:ip` — Legacy IP check (`requireAdmin`)
  - `POST /api/blocklist/test-cache-set`, `/test-cache-del` — Development-only test helpers (`requireAdmin` & `NODE_ENV !== 'production'`; unmounted in production)
- **Admin Authentication (`/api/auth`)**:
  - `POST /api/auth/admin-logout` — Invalidate admin session (`requireAdmin`)
  - `GET /api/auth/verify` — Verify admin session token (`requireAdmin`)

#### Public / Honeypot Decoy Endpoints (Intentionally Unauthenticated):
- `POST /api/auth/admin-login` — Admin authentication gateway (Protected by dedicated rate limiter: 5 attempts/15 min; bcrypt validation against `ADMIN_PASSWORD_HASH`).
- `POST /api/honeypot/login` — Attacker trap entry point (Protected by `loginLimiter`; traps decoy credentials, detects vectors, records encrypted `HoneyLog.fakeCredential`).
- `POST /api/session/register`, `/init`, `/honey`, `/active`, `/live-feed` — Honeypot simulation telemetry ingestion.
- `GET /api/blocklist/check-status` — Rate-limited client poll (40 req/min). Sourced strictly from connection socket (`req.ip`), ignores query parameters, returns binary `{ blocked: true/false }` without leaking reasons, vectors, or the global blocklist (per C4).
- `GET /api/health` — Service liveness probe.

---

## 3. Cryptographic Storage: Field-Level Vault Encryption (Path A)

### 3.1 Scope of Encryption
- **Target Model**: `HoneyLog` (`backend/models/HoneyLog.js`)
- **Target Field**: `fakeCredential`
- **Plaintext Fields Preserved for SOC Querying**:
  - `attackerIP`, `action`, `fakeTarget`, `timestamp`, `sessionId`, `deepTrap`, and `responseSimulated` remain unencrypted BSON strings/dates to preserve indexing, filtering, and aggregation performance.

### 3.2 Cipher Specification
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode).
- **IV Generation**: Fresh 12-byte random IV (`crypto.randomBytes(12)`) per encryption call. Zero IV reuse.
- **Storage Serialization**: Single colon-separated string: `iv:authTag:ciphertext` (all hex-encoded).
  - `iv`: 24 hex characters (12 bytes)
  - `authTag`: 32 hex characters (16 bytes)
  - `ciphertext`: Hex representation of encrypted plaintext

### 3.3 Startup Key Invariant
- `VAULT_ENCRYPTION_KEY` is loaded from the environment and validated in `backend/server.js` and `backend/services/dataVaultService.js`.
- The key must be exactly **64 hexadecimal characters (32 bytes)**.
- If missing, empty, or not matching `/^[0-9a-fA-F]{64}$/`, the process logs a fatal error and immediately exits with code 1 (`process.exit(1)`).

### 3.4 Decryption & Tamper Proofing
- Decryption occurs strictly server-side in `getSecureVaultData()` and `getSessionEvidence()`, gated behind `requireAdmin`.
- `crypto.createDecipheriv` verifies the 16-byte GCM authentication tag. If any byte of the ciphertext or tag is modified, `decipher.final()` throws an authentication error.
- Legacy string compatibility: Strings that do not match the 3-part hex format return as raw strings to prevent crashing on unmigrated data.

---

## 4. Network & Proxy Configuration

### 4.1 Reverse Proxy Trust Configuration
- In `backend/server.js`: `app.set('trust proxy', 1)`.
- Correct for Railway and single-hop reverse proxy architectures (e.g. Cloudflare / Vercel -> Railway load balancer).
- Ensures `req.ip` and rate limiters evaluate the real client IP forwarded in the edge proxy headers rather than the internal proxy IP, while preventing spoofed client headers from inner hops.

---

## 5. Database Persistence & Operational Invariants

### 5.1 Production Database Enforcement
- **Enforcement Location**: `backend/server.js` (`connectDB()`)
- **Supported Environment Variables**: Evaluates `process.env.MONGODB_URI || process.env.MONGO_URL` (supporting standard MongoDB URI conventions as well as Railway's default plugin variable).
- **Production Guard (`NODE_ENV === 'production'`)**:
  - If neither variable is configured, the server logs a fatal error (`[FATAL] Neither MONGODB_URI nor MONGO_URL is configured in production. Refusing to start without persistent database.`) and exits immediately with code 1 (`process.exit(1)`).
  - If connection to the specified MongoDB instance fails (e.g., DNS error, authentication failure, network timeout), the error is logged and the server exits immediately (`process.exit(1)`).
  - Ephemeral in-memory database fallback (`MongoMemoryServer`) is **strictly forbidden and unreachable** in production.
- **Boot Precondition**:
  - `await connectDB()` executes before `httpServer.listen()`. The application will never open its HTTP port or accept incoming traffic if persistent database initialization has failed.

### 5.2 Development Fallback
- Only when `process.env.NODE_ENV !== 'production'`, if a local persistent MongoDB daemon is unavailable, the server emits a loud console warning (`[DB WARNING] Starting In-Memory MongoDB Server for development only. Data will NOT persist across restarts!`) and initializes an isolated `MongoMemoryServer` instance to facilitate zero-setup local frontend development and testing.

