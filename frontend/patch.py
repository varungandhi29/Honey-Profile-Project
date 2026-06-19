import re

file_path = r"c:\Users\DELL\Desktop\Honey-Profile-Project\frontend\src\pages\HoneyShieldV2.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Chunk 1: registerAttackerAction
new_register = """  registerAttackerAction(actionType) {
    const session = this.sessions.find(s => s.id === "ATTACKER-SESSION");
    if (!session) return;

    const now = Date.now();
    session.clickBuffer.push(now);
    session.clickBuffer = session.clickBuffer.filter(t => now - t < 60000);

    const clicksIn60s = session.clickBuffer.length;
    const clicksIn10s = session.clickBuffer.filter(t => now - t < 10000).length;

    let finalAttackType = actionType;

    if (clicksIn10s > 10) {
      finalAttackType = "DDOS";
    } else if (clicksIn60s > 5 && actionType === "API_ABUSE") {
      finalAttackType = "API_ABUSE";
    } else if (clicksIn60s > 10) {
      finalAttackType = "BOT_ACTIVITY";
    }

    let action = "READ";
    let fakeTarget = actionType.toLowerCase() + "_target";
    if (actionType === 'DATA_EXFILTRATION') { action = 'DOWNLOAD'; fakeTarget = 'file_download'; }
    if (actionType === 'RECONNAISSANCE') { action = 'READ'; fakeTarget = 'file_view'; }
    if (actionType === 'COMMAND_INJECTION') { action = 'EXEC'; fakeTarget = 'restart_server'; }
    if (actionType === 'DIRECTORY_TRAVERSAL') { action = 'READ'; fakeTarget = 'view_logs'; }
    if (actionType === 'XSS_ATTACK') { action = 'WRITE'; fakeTarget = 'input_field'; }
    if (actionType === 'SQL_INJECTION') { action = 'READ'; fakeTarget = 'search_filter'; }
    if (actionType === 'CREDENTIAL_STUFFING') { action = 'WRITE'; fakeTarget = 'password_change'; }
    if (actionType === 'API_ABUSE') { action = 'READ'; fakeTarget = 'page_nav'; }

    const titleCaseMap = {
      'DATA_EXFILTRATION': 'Data Exfiltration',
      'RECONNAISSANCE': 'Reconnaissance',
      'COMMAND_INJECTION': 'Command Injection',
      'DIRECTORY_TRAVERSAL': 'Directory Traversal',
      'XSS_ATTACK': 'XSS Attack',
      'SQL_INJECTION': 'SQL Injection',
      'CREDENTIAL_STUFFING': 'Credential Stuffing',
      'API_ABUSE': 'API Abuse',
      'SESSION_HIJACKING': 'Session Hijacking',
      'MAN_IN_THE_MIDDLE': 'Man-in-the-Middle',
      'INSIDER_THREAT': 'Insider Threat',
      'ZERO_DAY_EXPLOIT': 'Zero-Day Exploit',
      'DDOS': 'DDoS / Volumetric',
      'BOT_ACTIVITY': 'Bot Activity'
    };

    const typeStr = titleCaseMap[finalAttackType] || finalAttackType;
    const attackObj = ATTACK_TYPES.find(a => a.type === typeStr);
    if (attackObj) {
      this.simulateAttack("ATTACKER-SESSION", attackObj);
    }

    const hEvent = {
      id: generateId(),
      sessionId: "ATTACKER-SESSION",
      attackerIP: "192.168.1.100",
      timestamp: formatDate(new Date()),
      action,
      fakeTarget,
      fakeCredential: null,
      responseSimulated: "200 OK"
    };
    
    this.honeyLog.unshift(hEvent);
    session.timeline.push({
      timestamp: formatDate(new Date()),
      action: `Honey: ${action}`,
      detail: `${action} on ${hEvent.fakeTarget}`
    });
    
    if (!session.attackTypes.includes("Honey Interaction")) {
      session.attackTypes.push("Honey Interaction");
    }

    this.updateCallback(this.getState());
  }"""

content = re.sub(
    r"  registerAttackerAction\(action, attackTypeStr, targetArea, fakeTarget\) \{.*?this\.updateCallback\(this\.getState\(\)\);\n  \}",
    new_register,
    content,
    flags=re.DOTALL
)

# Chunk 2: tick attacker session
new_tick_attacker = """    const attackerSession = this.sessions.find(s => s.id === "ATTACKER-SESSION");
    if (attackerSession && !attackerSession.blocked) {
      const sessionAgeSec = attackerSession.duration;
      
      if (sessionAgeSec > 0 && sessionAgeSec % 30 === 0) {
        this.registerAttackerAction('RECONNAISSANCE');
      }
      if (Math.random() < 0.05) {
        this.registerAttackerAction('ZERO_DAY_EXPLOIT');
      }
      if (sessionAgeSec === 120) {
        this.registerAttackerAction('SESSION_HIJACKING');
      }
      if (sessionAgeSec === 180) {
        this.registerAttackerAction('MAN_IN_THE_MIDDLE');
      }
      if (sessionAgeSec === 300) {
        this.registerAttackerAction('INSIDER_THREAT');
      }
    }"""

content = re.sub(
    r"    const attackerSession = this\.sessions\.find\(s => s\.id === \"ATTACKER-SESSION\"\);\n    if \(attackerSession && !attackerSession\.blocked\) \{.*?\}\n    \}",
    new_tick_attacker,
    content,
    flags=re.DOTALL
)

# Chunk 3: tick risk reporting
new_tick_risk = """      session.riskHistory.push({ time: formatDate(new Date()), score: session.riskScore });
      if (session.riskHistory.length > 20) session.riskHistory.shift();

      if (session.id !== "ATTACKER-SESSION") {
        fetch('/api/alerts/risk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.id, riskScore: session.riskScore })
        })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ATTACKER' && session.state !== 'ATTACKER') {
                session.state = 'ATTACKER';
                this.addAlert("HIGH", "Backend Risk Alert", `User risk score triggered ATTACKER state from backend`, session.id);
                this.updateCallback(this.getState());
            }
        })
        .catch(() => {});
      }
    });

    const activeAttackers = this.sessions.filter(s => s.state === "ATTACKER").length;"""

content = content.replace(
    """      session.riskHistory.push({ time: formatDate(new Date()), score: session.riskScore });
      if (session.riskHistory.length > 20) session.riskHistory.shift();
    });

    const activeAttackers = this.sessions.filter(s => s.state === "ATTACKER").length;""",
    new_tick_risk
)

# Chunk 4: AdminDashboard page navigation
new_admin_dash = """function AdminDashboard({ data, engine, settings, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ATTACKER') {
      fetch('/api/session/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentUser.id, eventType: 'PAGE_CHANGE', detail: activeTab })
      }).catch(() => {});
    }
  }, [activeTab, currentUser]);"""

content = content.replace(
    """function AdminDashboard({ data, engine, settings, currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState("Overview");""",
    new_admin_dash
)

# Chunk 5: App init
new_app_init = """export default function HoneyShieldApp() {
  const [currentUser, setCurrentUser] = useState(null);
  
  const [data, setData] = useState({ 
    sessions: [], attackLog: [], honeyLog: [], alertLog: [], autoResponseLog: [], 
    metrics: { uptimeSeconds: 0, totalSessionsProcessed: 0, totalAttacksLogged: 0 } 
  });
  
  const [settings, setSettings] = useState({
    suspiciousThreshold: 36,
    attackerThreshold: 70,
    decayRate: "Normal",
    honeyInterval: 10,
    fakeFiles: FAKE_FILES_INITIAL,
    autoRules: {
      autoHoney: true,
      blockZeroDay: true,
      blockDDoS: true,
      deepTrapAlert: true,
      flagInsider: true
    }
  });

  const engineRef = useRef(null);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new LiveDataEngine((newState) => {
        setData(newState);
      }, settings);
    }
    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ATTACKER' && engineRef.current) {
        engineRef.current.registerAttackerSession();
      } else if (engineRef.current) {
        // Fetch real session data for standard users
        fetch('/api/session/init')
          .then(r => r.json())
          .then(geo => {
            const sessions = engineRef.current.sessions;
            // Get the first NORMAL session (usually just spawned)
            const activeSession = sessions.find(s => s.state !== "ATTACKER");
            if (activeSession) {
                activeSession.id = currentUser.id;
                activeSession.ip = geo.ip;
                activeSession.country = geo.country;
                activeSession.city = geo.city;
                activeSession.lat = geo.lat;
                activeSession.lng = geo.lng;
                activeSession.browser = geo.browser;
                activeSession.os = geo.os;
                activeSession.device = geo.device;
                engineRef.current.updateCallback(engineRef.current.getState());
            }
          })
          .catch(e => console.error(e));
      }
    }
  }, [currentUser]);"""

content = re.sub(
    r"export default function HoneyShieldApp\(\) \{.*?\}, \[currentUser\]\);",
    new_app_init,
    content,
    flags=re.DOTALL
)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied to core logic.")
