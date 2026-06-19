# 🛡️ HoneyShield V2: Deception-Based Security Platform

HoneyShield is an advanced, deception-based security platform and threat visualization dashboard. It is designed to simulate a vulnerable environment to attract attackers, monitor their behavior in real time, and analyze threat patterns using an interactive 3D map and detailed analytics.


## ✨ Key Features

*   **🕵️ Deception Dashboard (Honeypot):** A simulated environment designed to log malicious activities, unauthorized access attempts, and simulated attacks.
*   **📊 Admin Dashboard:** A comprehensive, real-time monitoring interface for administrators to track active sessions, risk scores, and view live attack logs.
*   **🌍 3D Global Threat Visualization:** Interactive world map powered by `react-simple-maps` and `Three.js` to visualize the geographic origin of incoming connections and attacks.
*   **🔍 Real-Time Fingerprinting:** Captures IP addresses, precise geolocation, browser, OS, and device types using `geoip-lite` and `ua-parser-js`.
*   **📈 Dynamic Analytics:** Visualizes attack trends, session risks, and system health using `recharts`.
*   **🎨 Immersive 3D Visuals:** High-performance UI with glassmorphism, depth-based effects, cyber grids, and animated particles for a premium cyber-security aesthetic.

## 🛠️ Technology Stack

**Frontend:**
*   React 19 & Vite
*   Tailwind CSS v4 (Styling & Glassmorphism)
*   Three.js & React Three Fiber (3D Visuals & Global Map)
*   Recharts (Data Visualization)
*   React Simple Maps (Geo-mapping)
*   Lucide React (Icons)

**Backend:**
*   Node.js & Express
*   `geoip-lite` (IP Geolocation)
*   `ua-parser-js` (User-Agent Parsing)
*   CORS

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/varungandhi29/Honey-Profile-Project.git
    cd Honey-Profile-Project
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    npm start
    ```
    The backend will run on `http://localhost:3001`.

3.  **Setup Frontend:**
    Open a new terminal window:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    The frontend will run on `http://localhost:5173`.

## 🎮 Usage

1.  Navigate to `http://localhost:5173` in your browser.
2.  **Login System:** 
    *   Login as an **Admin** to view the monitoring dashboard.
    *   Login as an **Attacker/User** to access the Deception Dashboard and trigger simulated attacks.
3.  **Monitoring:** View real-time logs in the Admin dashboard as actions are taken in the Deception environment.

## 📁 Project Structure

```
Honey-Profile-Project/
├── backend/               # Node.js/Express API layer
│   ├── server.js          # Main server, session tracking, & geolocation logic
│   └── package.json
└── frontend/              # React/Vite UI layer
    ├── src/
    │   ├── components/    # Reusable UI & 3D components
    │   ├── engine/        # LiveDataEngine for simulated real-time state
    │   ├── pages/         # Login, Admin Dashboard, Deception Dashboard
    │   └── App.jsx        # Main application routing & session management
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 🛡️ Disclaimer

This project is a **simulation** and **visualization tool** designed for educational and demonstration purposes. It demonstrates the concepts of honeypots, behavioral monitoring, and threat intelligence dashboards.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
