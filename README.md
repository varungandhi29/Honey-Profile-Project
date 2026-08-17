# 🛡️ HoneyShield V2: Autonomous Cyber Deception & SOC Threat Intelligence Platform

<div align="center">

![HoneyShield Banner](https://img.shields.io/badge/HoneyShield-V2.0-blue?style=for-the-badge&logo=shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Globe-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML%20Engine-F7931E?style=for-the-badge&logo=scikitlearn)](https://scikit-learn.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

<p align="center">
  <b>A state-of-the-art, deception-based cybersecurity platform and SOC command center that lures adversaries into simulated vulnerable environments, extracts forensic telemetry, performs machine learning threat classification, and visualizes global attacks in real-time 3D.</b>
</p>

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [Tech Stack](#-technology-stack) • [Quick Start](#-quick-start) • [SOC Dashboard Modules](#-soc-dashboard-modules) • [API Reference](#-api-reference) • [Docker Deployment](#-docker-deployment)

</div>

---

## 📖 Overview

**HoneyShield V2** is an advanced cyber defense and deception platform engineered for Security Operations Centers (SOC), threat researchers, and red/blue teams. 

Instead of traditional passive defenses, HoneyShield deploys high-interaction deceptive decoys (honeypots, bait databases, canary tokens, fake endpoints) to actively trap attackers. It analyzes behavioral telemetry using a dedicated **Machine Learning AI Risk Engine**, tracks attacker activity via **real-time WebSockets**, captures hardware & canvas browser fingerprints, and isolates malicious actors across network perimeters.

---

## ✨ Key Features

### 🍯 High-Interaction Deception Environment (Honeypot)
* **Simulated Vulnerable Architecture**: Lures attackers with simulated financial platforms, SQL injection entry points, credential brute-force surfaces, and directory traversal vulnerabilities.
* **Bait Credentials & Canary Tokens**: Decoy API keys, fake customer records, and honeypot files that instantly trigger high-severity alerts when accessed or downloaded.
* **Deep Trap Behavioral Logging**: Logs all actions, keystrokes, navigation paths, and payload submissions without tipping off the adversary.

### 🧠 AI-Powered Threat Classification & Dynamic Risk Engine
* **Machine Learning Scoring (FastAPI + scikit-learn)**: Multi-parameter random forest classifier assessing session risk in real-time (scores `0-100`).
* **Adaptive Risk Gauges**: Automatically adjusts risk based on interaction frequency, payload severity, decoy depth, and threat intelligence feeds.
* **False-Positive / False-Negative Tuning**: Built-in analytics matrix to evaluate model precision, recall, and threshold sensitivity.

### 🌍 3D Global Threat Globe & Live Visualizer
* **Three.js / WebGL 3D Globe**: Real-time rendering of incoming attacks, visualizing geodesic trajectory arcs from source geolocations directly to target nodes.
* **Interactive 2D World Map**: Powered by `react-simple-maps` with cluster heatmaps, country-level attack breakdown, and latency statistics.

### 🖥️ Enterprise SOC Command Center
* **Live Session Replay & Telemetry Feed**: Real-time stream of active sessions, mouse tracking, and command execution logs.
* **MITRE ATT&CK Framework Mapping**: Automatically maps detected techniques to enterprise tactics (Reconnaissance, Initial Access, Execution, Credential Access, Exfiltration).
* **Audio & Visual Threat Alerting**: Real-time synthesized audio notifications, siren alerts, and visual banners for critical threat milestones.

### 🗄️ Forensic Data Vault & Evidence Locker
* **Forensic Session Dossiers**: Inspect comprehensive session logs, attack chronology, target areas, simulated responses, and network headers.
* **One-Click Evidence Export**: Download complete forensic evidence packages as formatted JSON or CSV reports for chain-of-custody documentation.

### 🛑 Multi-Tier Perimeter Defense & Automated Quarantine
* **Perimeter IP Blocklist**: Dynamic firewall blocking malicious IP addresses with customizable quarantine durations and unblock triggers.
* **Hardware & Browser Fingerprint Blocking**: Blocks adversaries even if they rotate IP addresses, using canvas, WebGL, audio, and device fingerprint hashes.
* **Live Session Termination**: SOC operators can quarantine or disconnect hostile sessions in real-time with one click.

---

## 🏗️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Adversary / User       │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   Frontend (React 19/Vite)  │
                                  │ ┌─────────────────────────┐ │
                                  │ │ Deception Honeypot      │ │
                                  │ │ SOC Admin Command Center│ │
                                  │ │ Three.js 3D Threat Globe│ │
                                  │ └─────────────────────────┘ │
                                  └──────────────┬──────────────┘
                                                 │ HTTP / WebSocket
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │ Backend Gateway (Express.js)│
                                  │ ┌─────────────────────────┐ │
                                  │ │ Session & Event Engine  │ │
                                  │ │ IP & Fingerprint Guard  │ │
                                  │ │ Data Vault & Forensics  │ │
                                  │ │ WebSocket Broadcast     │ │
                                  │ └────────────┬────────────┘ │
                                  └──────┬───────┴──────────────┘
                                         │               │
                         Internal RPC    │               │ Cache / Store
                                         ▼               ▼
                   ┌───────────────────────────┐   ┌───────────────────────────┐
                   │ AI Engine (FastAPI/Python)│   │  MongoDB  &  Redis Cache  │
                   │ ┌───────────────────────┐ │   │ ┌───────────────────────┐ │
                   │ │ Random Forest Model   │ │   │ │ Session Store         │ │
                   │ │ Feature Extraction    │ │   │ │ Attack Logs & Vault   │ │
                   │ │ Real-Time Risk Score  │ │   │ │ Dynamic Blocklist     │ │
                   │ └───────────────────────┘ │   │ └───────────────────────┘ │
                   └───────────────────────────┘   └───────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI / UX** | React 19, Vite, Tailwind CSS v4, Lucide React, Day.js |
| **3D & Visualizations** | Three.js, React Three Fiber (`@react-three/fiber`, `@react-three/drei`), Recharts, React Simple Maps, D3-Geo |
| **Backend & Real-Time** | Node.js (v18+), Express.js, Socket.IO, Helmet, Compression, Winston Logger, `geoip-lite`, `ua-parser-js` |
| **AI / Machine Learning** | Python 3.10+, FastAPI, scikit-learn, NumPy, Pandas, Joblib, Uvicorn |
| **Persistence & Cache** | MongoDB (Mongoose ORM / MongoDB Memory Server), Redis |
| **DevOps & Containers** | Docker, Docker Compose, Nginx |

---

## 📁 Directory Structure

```
Honey-Profile-Project/
├── ai-service/                   # Python FastAPI Machine Learning Engine
│   ├── features.py               # Telemetry feature extractor
│   ├── main.py                   # FastAPI application & /predict endpoints
│   ├── model.py                  # ML model loader and wrapper
│   ├── train.py                  # Model training pipeline
│   ├── requirements.txt          # Python dependencies
│   └── Dockerfile
├── backend/                      # Node.js / Express Gateway & Business Logic
│   ├── middleware/               # Security, auth, and rate-limiting middleware
│   ├── models/                   # Mongoose schemas (Session, Attack, HoneyLog, Alert, Blocklist)
│   ├── routes/                   # REST API routes (ai, alerts, analytics, blocklist, export, session, vault)
│   ├── services/                 # Risk engine, IP reputation, broadcast, cache & vault services
│   ├── socket.js                 # WebSocket event broadcaster
│   ├── server.js                 # Backend entry point
│   ├── package.json
│   └── Dockerfile
├── frontend/                     # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── audio/                # Alert sound synthesizers and audio assets
│   │   ├── components/           # 3D Globe, Modal viewers, Evidence modal, Charts
│   │   ├── engine/               # LiveDataEngine for real-time telemetry simulation
│   │   ├── hooks/                # Custom React hooks (useSocket, useAuth, etc.)
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx       # SOC Command Center Hub
│   │   │   ├── DeceptionDashboard.jsx   # Interactive Honeypot Target App
│   │   │   ├── LoginPage.jsx            # Dual-role entry authentication
│   │   │   └── admin/                   # 12 Modular SOC Pages
│   │   │       ├── OverviewPage.jsx
│   │   │       ├── LiveTrackingPage.jsx
│   │   │       ├── ActiveSessionsPage.jsx
│   │   │       ├── GeoMapPage.jsx
│   │   │       ├── AttackIntelligencePage.jsx
│   │   │       ├── HeatmapPage.jsx
│   │   │       ├── HoneyActivityPage.jsx
│   │   │       ├── DataVaultPage.jsx
│   │   │       ├── BlockedIPsPage.jsx
│   │   │       ├── FPFNAnalysisPage.jsx
│   │   │       ├── AIInsightsPage.jsx
│   │   │       └── SettingsPage.jsx
│   │   ├── utils/                # Geolocation, formatting, and helper utilities
│   │   ├── App.jsx               # Top-level routing & state coordination
│   │   └── index.css             # Tailwind CSS styles & glassmorphism tokens
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml            # Full-stack orchestration (Frontend, Backend, AI, Redis, Mongo)
└── README.md
```

---

## 🚀 Quick Start

### Option 1: One-Click Docker Deployment (Recommended)

Make sure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed:

```bash
# 1. Clone the repository
git clone https://github.com/varungandhi29/Honey-Profile-Project.git
cd Honey-Profile-Project

# 2. Build and launch all microservices
docker-compose up --build
```

Access the services:
* **Frontend UI**: `http://localhost:3000`
* **Backend API**: `http://localhost:3001`
* **AI Service Docs**: `http://localhost:8000/docs`

---

### Option 2: Local Development Setup

#### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: 3.10 or higher
* **npm** or **yarn**
* *(Optional)* MongoDB & Redis running locally (Backend includes automatic in-memory fallbacks if MongoDB/Redis are not active)

---

#### 2. Start the AI Engine (FastAPI)
```bash
cd ai-service

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train initial baseline model (if not already trained)
python train.py

# Start FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*API runs on `http://localhost:8000`*

---

#### 3. Start the Backend API (Node.js/Express)
Open a new terminal:
```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start backend server in development mode
npm run dev
# OR for production:
npm start
```
*Backend runs on `http://localhost:3001`*

---

#### 4. Start the Frontend Application (React/Vite)
Open a third terminal:
```bash
cd frontend

# Install dependencies
npm install

# Launch Vite development server
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🎮 SOC Command & Deception Workflow

1. Open your browser and navigate to `http://localhost:5173`.
2. **Choose your role on the Login Portal**:
   * 🛡️ **SOC Administrator**: Accesses the full **HoneyShield Admin Command Center** for threat intelligence, active session monitoring, and real-time defense actions.
   * 🥷 **Simulated Attacker**: Enters the **Deception Honeypot Environment** where interactive attacks (SQL Injection, XSS, Brute Force, Canary File Access, API tampering) can be simulated.
3. **Simulate Attacks**:
   * Perform malicious actions in the Deception Dashboard.
   * Switch to the Admin Command Center to observe real-time risk score escalation, 3D geographic tracking, MITRE ATT&CK categorization, and automatic IP/fingerprint quarantine.

---

## 📊 SOC Dashboard Modules

| Module | Description |
|---|---|
| 📡 **Overview Hub** | Key metric counters (Active Sessions, Attacking IPs, Critical Alerts, Honeypot Hits), live event feed, threat gauge. |
| 👁️ **Live Tracking** | Real-time session activity, mouse coordinates, keypress telemetry, active view tracking. |
| 👥 **Active Sessions** | Granular session table with risk level badges, deep drill-down modals, and instant quarantine buttons. |
| 🌐 **3D Threat Globe** | WebGL Three.js interactive globe rendering ballistic attack arcs from attack sources to target servers. |
| 🎯 **Attack Intelligence** | MITRE ATT&CK Matrix alignment, vulnerability breakdowns, and attacker profile categorizations. |
| 🗺️ **Heatmap Matrix** | 24-hour temporal attack density and vector distributions. |
| 🍯 **Honey Activity** | Real-time logs of decoy database queries, canary file triggers, and trap engagements. |
| 🗄️ **Data Vault** | Tamper-evident forensic evidence storage with single-session and global JSON/CSV export capabilities. |
| 🚫 **Perimeter Blocklist** | Multi-tier enforcement center managing blocked IP addresses and hardware browser fingerprints. |
| ⚖️ **FP/FN Analysis** | False-Positive and False-Negative evaluation matrix with real-time threshold fine-tuning. |
| 🧠 **AI Insights** | Model telemetry, feature importance charts, confidence intervals, and decision tree logic. |
| ⚙️ **SOC Settings** | Configurable alert sounds, sensitivity sliders, automated defense thresholds, and webhook endpoints. |

---

## 📡 API Reference

### Backend Endpoints (`http://localhost:3001/api`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/session/login` | Authenticate or initialize an attacker/admin session |
| `GET` | `/session/active` | Retrieve all active sessions with risk metrics |
| `POST` | `/session/action` | Record an attacker interaction or simulated payload |
| `POST` | `/session/kill/:id` | Terminate and quarantine an active session |
| `GET` | `/vault` | Fetch comprehensive forensic evidence logs |
| `GET` | `/vault/export` | Download full forensic data as a JSON file |
| `GET` | `/vault/session/:id` | Get forensic dossier for a specific session ID |
| `GET` | `/blocklist` | List all blocked IP addresses and browser fingerprints |
| `POST` | `/blocklist/ip` | Manually block or unblock an IP address |
| `POST` | `/blocklist/fingerprint` | Manually block or unblock a hardware fingerprint |
| `GET` | `/analytics/overview` | Fetch aggregated SOC metrics and chart data |
| `GET` | `/alerts` | Get list of recent threat notifications |

### AI Engine Endpoints (`http://localhost:8000`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & model status |
| `POST` | `/predict` | Predict session risk score and threat classification |
| `POST` | `/train` | Trigger retraining of the Random Forest model |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/honeyshield
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=500
SESSION_EXPIRY=3600
```

### AI Engine (`ai-service/.env`)
```env
PORT=8000
MODEL_PATH=./model.pkl
```

---

## 🛡️ Security & Ethical Disclaimer

> [!IMPORTANT]
> **HoneyShield V2** is built for **educational, defensive research, and authorized security demonstration purposes only**. All attacks executed within the deception environment are contained simulations. Always obtain proper authorization prior to deploying deception systems in production environments.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Developed with ❤️ for the Cybersecurity & SOC Community.</sub>
</div>
