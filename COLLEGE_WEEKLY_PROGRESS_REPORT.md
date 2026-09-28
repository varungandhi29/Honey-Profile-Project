# DEPARTMENT OF COMPUTER ENGINEERING / INFORMATION TECHNOLOGY
## B.TECH / B.E. 7TH SEMESTER — MAJOR PROJECT WEEKLY PROGRESS REPORT

---

### **PROJECT DETAILS**
- **Project Title:** HoneyShield: AI-Powered Cyber Deception, Deceptive Honeypot Profiling & Real-Time SOC Intelligence System
- **Student Name:** Varun Gandhi
- **Project Repository:** `varungandhi29/Honey-Profile-Project`
- **Live Deployment URL:** `https://honeyprofile.vercel.app`
- **Academic Semester:** 7th Semester
- **Semester Commencement Date:** June 12, 2026
- **Weekly Report Start Date:** June 26, 2026 (Commencing 2 weeks post semester start)
- **Report Period Covered:** June 26, 2026 – September 28, 2026 (14 Weeks)

---

## EXECUTIVE SUMMARY & ARCHITECTURAL HIGHLIGHTS

HoneyShield is an advanced Security Operations Center (SOC) deception and threat intelligence platform designed to proactively detect, lure, profile, and neutralize cyber adversaries. Rather than relying solely on passive perimeter defense, the system deploys high-interaction honeypots, fake file systems, synthetic database endpoints, and active decoy assets.

### Key Innovations Developed During the 7th Semester:
1. **Real-Time 3D Interactive Cyber Threat Globe:** Three.js / WebGL powered dynamic threat visualizer rendering real-time arc trajectories from global attacker origins to targeted honeypot nodes.
2. **Web Audio API Emergency Police Siren Alert System:** Real-time synthesis of alternating dual-frequency (600 Hz – 960 Hz) police sirens that trigger instantly upon intrusion and automatically terminate upon administrator containment/blocking.
3. **Cross-Tab Real-Time Sync Engine (HoneyBus):** High-performance event bus implementing native `BroadcastChannel` with `localStorage` storage-event fallback, enabling seamless zero-latency attack notifications and forensic synchronization across distributed browser sessions without backend polling.
4. **Zero-Bypass Attacker Containment & Fingerprinting:** Deep hardware and canvas fingerprinting engine that detects evasive attackers even when switching to private/incognito browsing or rotating IP addresses via VPN/Proxy tunnels, presenting an immediate containment lockdown modal.
5. **Zero-Trust Encrypted Data Vault & Password-Protected Dispatch:** Multi-media storage supporting images, streaming HTML5 video, binary documents, and classified notes. Includes recipient-level isolation and AES-style password challenge barriers where only the designated user with the exact access password can decrypt and view sensitive files.
6. **Role-Segregated User Ecosystem & Dynamic Credential Management:** Custom tailored experiences for SOC Administrators (`varun@g`), Legitimate Corporate Employees (`dhruv@l`, `rudra@b`), and Trapped Attackers (`darshan@p`), supported by an administrative User Management center.

---

## WEEK-BY-WEEK PROGRESS REPORT

---

### **WEEK 1: June 26, 2026 – July 02, 2026**
- **Phase:** Project Inception, Requirement Refinement & Core Architecture Setup
- **Tasks & Objectives:**
  - Formulate detailed 7th-semester major project objectives with faculty supervisor.
  - Establish modular repository architecture dividing Frontend (React 18 + Vite), Backend (Node.js/Express REST microservice), and AI Engine (Python FastAPI).
  - Define threat models, attacker user stories, and SOC analyst workflows.
- **Work Completed:**
  - Set up unified project repository and initialized Vite-based frontend with Tailwind CSS and Lucide React iconography.
  - Implemented the base Cyberpunk SOC Dark Theme palette (`#0D1117` background, `#161B22` panels, `#00FF88` glowing accents).
  - Drafted comprehensive System Requirement Specification (SRS) document for deception technology.
- **Tools & Technologies:** React 18, Vite, Node.js, Git, Figma.
- **Challenges & Solutions:** Balancing high-frequency state updates with React rendering cycles; resolved by planning an event-driven telemetry engine.
- **Milestone Status:** Completed.

---

### **WEEK 2: July 03, 2026 – July 09, 2026**
- **Phase:** Telemetry Engine & In-Memory Deception Pipeline
- **Tasks & Objectives:**
  - Build `LiveDataEngine.js` to simulate and ingest high-velocity cyber telemetry.
  - Implement dynamic risk scoring calculation algorithms based on attack frequency, payload severity, and endpoint sensitivity.
- **Work Completed:**
  - Developed `LiveDataEngine.js` managing active sessions, attack logs, honeypot access logs, and security alert queues.
  - Integrated dynamic threat scoring algorithms calculating risk scores (0–100) and mapping threat levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - Implemented synthetic telemetry generators for initial system benchmarking and baseline profiling.
- **Tools & Technologies:** JavaScript (ES6+), React Hooks (`useRef`, `useEffect`), Custom Observer Pattern.
- **Challenges & Solutions:** Telemetry state resetting on component remounts; resolved by anchoring engine references via `useRef` at the application root.
- **Milestone Status:** Completed.

---

### **WEEK 3: July 10, 2026 – July 16, 2026**
- **Phase:** Core SOC Dashboard & Analytical Visualizations
- **Tasks & Objectives:**
  - Construct SOC Analyst Overview page with real-time KPI metrics.
  - Integrate telemetry charts displaying attack vectors, protocol distributions, and threat trends.
- **Work Completed:**
  - Built SOC Metrics Overview with animated KPI cards (Total Attacks, Active Attackers, Honeypot Hits, Critical Breaches).
  - Integrated Recharts visual library for real-time Attack Vector distribution (Brute Force, SQLi, DDoS, XSS, Exfiltration).
  - Developed Attack Intelligence log with granular filtering by severity, timestamp, and target IP.
- **Tools & Technologies:** Recharts, CSS Grid, Lucide-React.
- **Challenges & Solutions:** Chart re-rendering causing UI stuttering; optimized by memoizing chart data structures via `useMemo`.
- **Milestone Status:** Completed.

---

### **WEEK 4: July 17, 2026 – July 23, 2026**
- **Phase:** Real-Time 3D Interactive Cyber Threat Globe
- **Tasks & Objectives:**
  - Design and deploy an interactive 3D WebGL globe to visualize global cyber attacks in real time.
  - Plot spatial attack vectors connecting attacker geographical coordinates to target infrastructure.
- **Work Completed:**
  - Implemented `GeoMapPage.jsx` utilizing Three.js and WebGL.
  - Modeled a 3D Earth sphere with atmospheric glow shaders, latitude/longitude coordinate mapping, and rotation controls.
  - Added dynamic parabolic 3D arc splines connecting attack origin countries to target honeypot locations with pulsating cyber-hazard markers.
- **Tools & Technologies:** Three.js, WebGL, Spherical Trigonometry, Canvas API.
- **Challenges & Solutions:** GPU resource consumption during rapid trajectory spawning; solved by pooling particle geometries and optimizing render loops via `requestAnimationFrame`.
- **Milestone Status:** Completed.

---

### **WEEK 5: July 24, 2026 – July 30, 2026**
- **Phase:** Honeypot Traps & Deceptive File System Architecture
- **Tasks & Objectives:**
  - Construct deceptive breadcrumb assets and decoy file directories to lure intruders.
  - Implement access traps on synthetic enterprise assets.
- **Work Completed:**
  - Built `HoneyTrapsPage.jsx` and deceptive decoy catalog: `payroll_2025.xlsx`, `backup_encryption_keys.txt`, `vpn_config_files.zip`, and synthetic database connection configs.
  - Implemented deceptive download interception: when an attacker accesses or downloads a decoy file, a `DATA_EXFILTRATION` or `HONEY_INTERACTION` alert is instantly generated.
  - Created Honey Activity inspection table providing forensic breakdowns of attacker keystrokes and clicked breadcrumbs.
- **Tools & Technologies:** Deception Engineering, MIME simulation, React state architecture.
- **Challenges & Solutions:** Ensuring decoy files appear authentic without leaking genuine system information; authored realistic obfuscated synthetic payloads.
- **Milestone Status:** Completed.

---

### **WEEK 6: July 31, 2026 – August 06, 2026**
- **Phase:** Dual-Perspective Architecture & Attacker Deception Portal
- **Tasks & Objectives:**
  - Separate application entry points into two distinct realities: The SOC Defender reality and the Trapped Attacker reality.
  - Develop an interactive Exploit Console for simulating adversarial techniques.
- **Work Completed:**
  - Designed role-based interface routing: Admin credentials lead to HoneyShield SOC, while test attacker credentials lead to a fake corporate dashboard.
  - Implemented `ExploitConsole.jsx` allowing the attacker to launch simulated attacks (SQL Injection, Credential Stuffing, Brute Force, Directory Traversal, Zero-Day Exploits).
  - Hooked exploit actions to trigger real-time defensive telemetry pipelines.
- **Tools & Technologies:** React Router, Role-Based Access Control (RBAC), Event Handlers.
- **Challenges & Solutions:** Preventing unauthorized traversal from the attacker portal to admin routes; implemented strict route guards and role verification checks.
- **Milestone Status:** Completed.

---

### **WEEK 7: August 07, 2026 – August 13, 2026**
- **Phase:** Auditory Alert System (Emergency Police Car Siren)
- **Tasks & Objectives:**
  - Develop a real-time auditory alert mechanism to notify SOC engineers during critical system intrusions.
  - Model a realistic emergency siren sound using pure web standards without external audio file dependencies.
- **Work Completed:**
  - Created `alertSound.js` utilizing the native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`).
  - Synthesized dual-tone police car siren modulating dynamically between 600 Hz and 960 Hz at rapid 180 ms intervals.
  - Integrated `startContinuousAlert()` and `stopContinuousAlert()` lifecycle methods.
  - Connected the siren to fire continuously upon detection of high-risk attacks (`riskScore >= 70` or `CRITICAL` severity).
- **Tools & Technologies:** Web Audio API, Frequency Modulation, Audio Synthesis.
- **Challenges & Solutions:** Browser autoplay restrictions blocking audio prior to user interaction; implemented an AudioContext resume listener triggered upon user login/click.
- **Milestone Status:** Completed.

---

### **WEEK 8: August 14, 2026 – August 20, 2026**
- **Phase:** One-Click Administrator Containment & Siren Termination
- **Tasks & Objectives:**
  - Enable SOC operators to instantly block malicious IPs, user sessions, or attacker fingerprints.
  - Synchronize blocking actions with the audio alert system to silence sirens immediately upon containment.
- **Work Completed:**
  - Implemented `onBlockIP` and `onBlockFingerprint` handler functions across Active Sessions, Geo Map, and Alert Center.
  - Created `BlockedIPsPage.jsx` providing a ledger of contained threat actors with options to unblock or inspect containment history.
  - Hooked the block action to invoke `alertSound.stopContinuousAlert()`, silencing the alarm the exact millisecond the threat is neutralized.
- **Tools & Technologies:** Event Dispatchers, Audio Lifecycle Hooks, State Management.
- **Challenges & Solutions:** State propagation latency between the block action and the audio context; resolved by immediate synchronous execution of the audio stop hook prior to async state updates.
- **Milestone Status:** Completed.

---

### **WEEK 9: August 21, 2026 – August 27, 2026**
- **Phase:** Advanced Evasion Mitigation: Incognito & VPN Hardware Fingerprinting
- **Tasks & Objectives:**
  - Prevent attackers from bypassing blocks by opening incognito/private windows or using VPN/Proxy services.
  - Develop deep hardware fingerprinting independent of cookies or local storage.
- **Work Completed:**
  - Built advanced client fingerprinting engine collecting Canvas 2D render hashes, WebGL graphics card vendor strings, screen color depths, CPU core counts, and audio frequency responses.
  - Integrated VPN/Proxy detection analyzing WebRTC candidate IP leaks, subnet mismatch indicators, and timezone-IP latency differentials.
  - Developed strict containment enforcement: if a blocked attacker switches to Incognito or toggles a VPN, their hardware fingerprint matches the blocklist, instantly denying access.
- **Tools & Technologies:** Canvas Fingerprinting, WebGL Context, WebRTC API, Network Heuristics.
- **Challenges & Solutions:** Minor canvas rendering variances across browser rendering engines; implemented normalized hash hashing algorithms to ensure consistent device matching.
- **Milestone Status:** Completed.

---

### **WEEK 10: August 28, 2026 – September 03, 2026**
- **Phase:** Attacker Containment Lockdown Modal & Identity Configuration
- **Tasks & Objectives:**
  - Create a containment overlay completely locking the attacker's browser interface upon administrator block.
  - Re-align project authentication credentials to academic team specifications.
- **Work Completed:**
  - Created full-screen `ContainmentModal.jsx` featuring high-visibility warning iconography: *"ACCESS TERMINATED: System Intrusion Detected - Your IP and Hardware Fingerprint Have Been Flagged and Blocked by HoneyShield SOC"*.
  - Configured standardized multi-role credentials:
    - **Administrator:** `varun@g` / `varun@29`
    - **Trapped Attacker / Test User:** `darshan@p` / `darshan@123`
    - **Legitimate Corporate User 1:** `dhruv@l` / `dhruv@123`
    - **Legitimate Corporate User 2:** `rudra@b` / `rudra@123`
- **Tools & Technologies:** CSS Modals, Z-Index Layering, Security Identity Mapping.
- **Challenges & Solutions:** Attackers attempting to dismiss or inspect-element the modal; bound listeners to prevent keyboard dismissal (`Escape`) and disabled background pointer events.
- **Milestone Status:** Completed.

---

### **WEEK 11: September 04, 2026 – September 10, 2026**
- **Phase:** Dedicated Corporate User Portal & Administrative User Management
- **Tasks & Objectives:**
  - Develop a dedicated workspace UI for legitimate staff (`UserDashboard.jsx`) distinct from both the Admin SOC and the Attacker Exploit Console.
  - Implement an administrative User Management center for provisioning employee accounts.
- **Work Completed:**
  - Created `UserDashboard.jsx` tailored for enterprise employees (`dhruv@l`, `rudra@b`), containing Workspace KPIs, Security Incident Reporting forms, Company Documents access, and Personal Security Profiles.
  - Built `UserManagementPage.jsx` for Admin: allows adding new users, assigning roles (`USER`, `ADMIN`, `ATTACKER`), auto-generating cryptographically strong 10-character passwords (`⚡ Auto-Gen`), and deleting users.
  - Connected incident reports filed by users directly into the Admin Alert Center for SOC review.
- **Tools & Technologies:** RBAC, Form Validation, Cryptographic Random Password Generator.
- **Challenges & Solutions:** Distinguishing employee threat incidents from malicious attacker activities; separated regular user reports into an internal review queue.
- **Milestone Status:** Completed.

---

### **WEEK 12: September 11, 2026 – September 17, 2026**
- **Phase:** Cloud Staging, Vercel & Railway Deployment Pipeline
- **Tasks & Objectives:**
  - Deploy frontend to Vercel production hosting (`https://honeyprofile.vercel.app`).
  - Configure production environment variables, proxy routing, and build optimizations.
- **Work Completed:**
  - Resolved Vite production bundling warnings and optimized chunk splitting.
  - Configured Vercel deployment with dynamic single-page application (SPA) rewrites in `vercel.json`.
  - Configured Railway backend service containerization with automated health check endpoints.
- **Tools & Technologies:** Vercel CLI, Railway, Docker, Vite Build Optimizer.
- **Challenges & Solutions:** UTF-8 BOM encoding issues in deployment JSON configs causing build failures; sanitized file encodings and verified zero-error build pipelines.
- **Milestone Status:** Completed.

---

### **WEEK 13: September 18, 2026 – September 24, 2026**
- **Phase:** Cross-Tab Real-Time Sync Engine (HoneyBus)
- **Tasks & Objectives:**
  - Resolve cross-tab memory isolation on static cloud deployments where attacks executed in Tab 2 (Attacker) were not displaying in Tab 1 (Admin).
  - Guarantee permanent forensic persistence of attacker telemetry across sessions and tab closures.
- **Work Completed:**
  - Engineered `honeyBus.js`: an inter-tab broadcast event bus using native `BroadcastChannel` with `localStorage` storage-event fallback.
  - Integrated `honeyBus` into `LiveDataEngine.js` and `App.jsx`:
    - When Attacker executes an exploit in Tab 2, an `ATTACK_EVENT` is broadcasted immediately.
    - Admin in Tab 1 intercepts the event in real-time, adds the attack to the Attack Log, triggers the police car siren, and displays critical red alert toasts.
  - Modified `removeSession()`: strictly preserved `role === 'ATTACKER'` sessions so forensic records remain intact even if the attacker logs out or closes their window.
  - Implemented state hydration from `localStorage` (`honeyshield_live_sessions`, etc.) so browser refreshes maintain active attacker telemetry.
- **Tools & Technologies:** HTML5 BroadcastChannel API, LocalStorage Events, Reactive Pub/Sub Pattern.
- **Challenges & Solutions:** Cross-tab message race conditions causing duplicate logs; implemented event deduplication using unique payload UUIDs and timestamps.
- **Milestone Status:** Completed.

---

### **WEEK 14: September 25, 2026 – September 28, 2026**
- **Phase:** Zero-Trust Encrypted Data Vault & Password-Protected Sharing Barrier
- **Tasks & Objectives:**
  - Implement a secure multi-media storage vault allowing Admin to upload Images, Videos, Documents, and Classified Text.
  - Provide strict Zero-Trust access isolation: attackers have zero access, and files sent to a specific user require an access password to unlock.
  - Enable legitimate users to upload encrypted files into the vault.
- **Work Completed:**
  - Developed `secureVault.js` and Admin `SecureVaultPage.jsx`:
    - Multi-media upload: Images (`.png`, `.jpg`, `.gif`), Videos (`.mp4`, `.webm` with in-browser HTML5 `<video controls>`), Documents (`.pdf`, `.docx`, `.xlsx`, `.zip`), and Classified Secret Text notes.
    - Admin editing & deletion: update title, recipient, password, and text notes anytime.
    - Full in-browser preview modals for images, streaming video playback, document downloads, and text viewing.
  - Built Zero-Trust isolation logic:
    - Attackers (`darshan@p` or blocked users) receive an empty array (`[]`) with zero visibility.
    - Files assigned to a specific user (e.g. `dhruv@l`) are completely hidden from other users (e.g. `rudra@b`).
  - Developed Password Challenge Barrier in `UserDashboard.jsx`:
    - Files assigned to an employee display with a `🔒 Access Password Required` shield and masked content.
    - User must click **Unlock & View** and provide the exact access password set by Admin.
    - Upon verification, the content decrypts for viewing, playback, or download.
  - Added user file upload capability allowing employees (`dhruv@l`, `rudra@b`) to store their own encrypted documents and notes.
- **Tools & Technologies:** Base64 Data Encoding, MIME Processing, HTML5 Video Player, Cryptographic Validation.
- **Challenges & Solutions:** Video file memory limits in browser storage; implemented chunked Base64 encoding with MIME type enforcement and stream URL creation.
- **Milestone Status:** Completed & Fully Deployed.

---

## CONSOLIDATED TECHNICAL FEATURE MATRIX

| Feature Name | Primary Role | Implementation Details | Academic & Industrial Relevance |
| :--- | :--- | :--- | :--- |
| **Real-Time 3D Threat Globe** | Admin / SOC | Three.js, WebGL, Spherical Coordinates, Dynamic Trajectory Splines | Spatial telemetry mapping and dynamic situational awareness |
| **Emergency Police Car Siren** | SOC Alerting | Web Audio API, Dual Oscillators (600–960 Hz), Dynamic Frequency Modulation | Multimodal sensory alerting during high-severity cyber breaches |
| **One-Click Instant Containment** | SOC Defender | Synchronous IP & Hardware Fingerprint Blacklisting + Siren Cutoff | Zero-latency incident response and containment automation |
| **HoneyBus Event Bus** | Core System | HTML5 `BroadcastChannel` + Storage Event Fallback | Distributed real-time synchronization on static cloud architectures |
| **Incognito & VPN Mitigation** | Security Guard | Canvas 2D Hash + WebGL Vendor + WebRTC Candidate Leak Analysis | Defense against evasive threat actors and fingerprint manipulation |
| **Interactive Exploit Console** | Attacker Deception | 12+ Simulated Exploit Vectors (SQLi, Zero-Day, Exfiltration, etc.) | High-interaction deception profiling and behavioral analysis |
| **Deceptive Honeypot Traps** | Deception Layer | Decoy File Catalog, Synthetic Credentials, Fake Database Endpoints | Proactive adversary luring, time delay, and tactic observation |
| **Zero-Trust Secure Vault** | Admin & Users | Multi-format (Image, Video, Doc, Text) with in-browser HTML5 player | Confidential corporate asset protection and forensic storage |
| **Password-Protected Dispatch** | Admin to User | Identity-filtered dispatch with password unlock challenge modal | Controlled need-to-know information dissemination barrier |
| **Dynamic User Management** | Admin | Full CRUD for users + Role assignment + 10-char password generator | Enterprise identity governance and access control |

---

## WEEKLY PROGRESS TRACKING & FACULTY SIGN-OFF TABLE

| Week No. | Date Interval | Planned Objectives | Completed Deliverables | Status | Faculty / Guide Signature |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **W01** | 26/06/2026 – 02/07/2026 | Architecture Setup & SRS Definition | Project scaffolding, SOC dark theme, SRS | **Completed** | _______________ |
| **W02** | 03/07/2026 – 09/07/2026 | Telemetry Engine & Dynamic Scoring | `LiveDataEngine.js`, risk scoring algorithm | **Completed** | _______________ |
| **W03** | 10/07/2026 – 16/07/2026 | SOC Dashboard & Recharts Analytics | Metrics KPI overview, attack vector charts | **Completed** | _______________ |
| **W04** | 17/07/2026 – 23/07/2026 | 3D Interactive WebGL Threat Globe | Three.js Earth model, real-time attack arcs | **Completed** | _______________ |
| **W05** | 24/07/2026 – 30/07/2026 | Honeypot Traps & Decoy Assets | Decoy file system, download trap interceptors | **Completed** | _______________ |
| **W06** | 31/07/2026 – 06/08/2026 | Attacker Portal & Exploit Console | Role-segregated deception reality, exploit tools | **Completed** | _______________ |
| **W07** | 07/08/2026 – 13/08/2026 | Web Audio Emergency Police Siren | Pure Web Audio API synthesis (600–960 Hz) | **Completed** | _______________ |
| **W08** | 14/08/2026 – 20/08/2026 | One-Click Block & Siren Termination | Immediate block handler, auto siren shutoff | **Completed** | _______________ |
| **W09** | 21/08/2026 – 27/08/2026 | Incognito & VPN Hardware Fingerprinting | Canvas, WebGL, WebRTC leak detection heuristics | **Completed** | _______________ |
| **W10** | 28/08/2026 – 03/09/2026 | Containment Lockdown Modal & Accounts | Full-screen breach modal, standardized user IDs | **Completed** | _______________ |
| **W11** | 04/09/2026 – 10/09/2026 | Employee Workspace & User Management | `UserDashboard.jsx`, Admin User Management UI | **Completed** | _______________ |
| **W12** | 11/09/2026 – 17/09/2026 | Cloud Production Deployment | Vercel SPA deployment, production optimizations | **Completed** | _______________ |
| **W13** | 18/09/2026 – 24/09/2026 | Cross-Tab Real-Time Sync (HoneyBus) | `BroadcastChannel` event bus, forensic persistence | **Completed** | _______________ |
| **W14** | 25/09/2026 – 28/09/2026 | Zero-Trust Vault & Password Dispatch | Multi-media vault, password barrier, user upload | **Completed** | _______________ |

---

### **STUDENT DECLARATION & SIGN-OFF**
I hereby declare that the work presented in this 14-week progress report represents genuine engineering contributions, system design, architectural modeling, and functional software development conducted under the supervision of my faculty project guide for the 7th Semester B.Tech Major Project.

**Student Name:** Varun Gandhi  
**Date:** September 28, 2026  
**Project Guide Name / Signature:** ___________________________  
**Department Head / Coordinator Signature:** ___________________________
