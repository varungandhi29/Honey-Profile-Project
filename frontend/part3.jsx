// part3.jsx
const GeoMapPage = ({ data }) => {
  const mapData = data.sessions.map(s => ({
    x: s.lng,
    y: s.lat,
    z: s.riskScore,
    id: s.id,
    ip: s.ip,
    state: s.state,
    country: s.country
  }));

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-in fade-in">
      <Card title="Global Threat Map" className="flex-1">
        <div className="w-full h-full bg-[#1A1A1A] rounded-[16px] relative overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis type="number" dataKey="x" domain={[-180, 180]} hide />
              <YAxis type="number" dataKey="y" domain={[-90, 90]} hide />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <RechartsTooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const s = payload[0].payload;
                    return (
                      <div className="bg-[#242424] p-3 rounded-[16px] shadow-lg text-sm border border-[#333]">
                        <p className="font-mono text-white font-bold mb-1">{s.ip}</p>
                        <p className="text-[#888888] mb-2">{s.country}</p>
                        <Badge color={s.state === 'ATTACKER' ? 'red' : s.state === 'SUSPICIOUS' ? 'amber' : 'green'}>{s.state}</Badge>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {['NORMAL', 'SUSPICIOUS', 'ATTACKER'].map(state => (
                <Scatter 
                  key={state}
                  data={mapData.filter(d => d.state === state)} 
                  fill={state === 'ATTACKER' ? '#FF8C00' : state === 'SUSPICIOUS' ? '#FFFFFF' : '#A8E063'} 
                  opacity={0.8}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.5 }}></div>
        </div>
      </Card>
      <div className="w-80 space-y-4">
        <Card title="Origin Countries">
          <div className="space-y-3">
            {Object.entries(data.sessions.reduce((acc, s) => {
              acc[s.country] = (acc[s.country] || 0) + 1;
              return acc;
            }, {})).sort((a,b)=>b[1]-a[1]).map(([c, count]) => (
              <div key={c} className="flex justify-between items-center text-sm">
                <span className="text-white flex items-center gap-2 font-bold"><MapPin size={14} className="text-[#888888]"/> {c}</span>
                <span className="font-mono text-[#888888] bg-[#2A2A2A] px-2 py-0.5 rounded-full">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const HeatmapPage = ({ data }) => {
  const matrix = {};
  TARGET_AREAS.forEach(t => {
    matrix[t] = {};
    ATTACK_TYPES.forEach(a => matrix[t][a.type] = 0);
  });
  
  data.attackLog.forEach(log => {
    if(matrix[log.targetArea] && matrix[log.targetArea][log.type] !== undefined) {
      matrix[log.targetArea][log.type]++;
    }
  });

  const getIntensityColor = (val) => {
    if (val === 0) return '#1A1A1A';
    if (val < 2) return '#3d5224';
    if (val < 5) return '#5b7a35';
    if (val < 10) return '#82ad4d';
    return '#A8E063';
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <Card title="Target vs Attack Type Matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left w-40 text-[#888888] font-[800] uppercase tracking-[0.1em]">Target \ Type</th>
                {ATTACK_TYPES.slice(0, 10).map(a => (
                  <th key={a.type} className="p-2 truncate w-20 whitespace-nowrap text-white font-[800] rotate-45 origin-bottom-left" title={a.type}>{a.type.substring(0,8)}.</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TARGET_AREAS.slice(0, 8).map(target => (
                <tr key={target}>
                  <td className="p-2 text-white font-bold truncate" title={target}>{target}</td>
                  {ATTACK_TYPES.slice(0, 10).map(a => {
                    const count = matrix[target][a.type];
                    return (
                      <td key={a.type} className="p-0.5 relative group">
                        <div 
                          className="w-full h-8 rounded-[8px] transition-colors"
                          style={{ backgroundColor: getIntensityColor(count) }}
                        ></div>
                        {count > 0 && (
                          <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1A1A1A] text-white px-2 py-1 rounded-lg text-xs z-10 whitespace-nowrap">
                            {count} {a.type} on {target}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const AlertCenterPage = ({ data }) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <Card title="System Alerts">
        <div className="space-y-4">
          {data.alertLog.map(alert => (
            <div key={alert.id} className={`flex items-start gap-4 p-5 rounded-[16px] bg-[#2A2A2A] border-l-4 ${alert.severity === 'CRITICAL' ? 'border-[#FF8C00]' : alert.severity === 'HIGH' ? 'border-white' : 'border-[#A8E063]'}`}>
              <div className="mt-1">
                {alert.severity === 'CRITICAL' ? <ShieldAlert className="text-[#FF8C00]" size={24} /> : 
                 alert.severity === 'HIGH' ? <AlertTriangle className="text-white" size={24} /> : 
                 <Bell className="text-[#A8E063]" size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold ${alert.severity === 'CRITICAL' ? 'text-[#FF8C00]' : 'text-white'}`}>{alert.title}</h4>
                  <span className="font-mono text-xs text-[#888888]">{alert.timestamp}</span>
                </div>
                <p className="text-[#888888] text-sm mt-2">{alert.description}</p>
                {alert.sessionId && <p className="text-xs font-mono text-white font-bold mt-3">Ref Session: {alert.sessionId}</p>}
              </div>
              <div>
                <button className="px-4 py-2 bg-[#1A1A1A] text-xs font-bold text-white hover:bg-[#333] rounded-full transition-colors">Acknowledge</button>
              </div>
            </div>
          ))}
          {data.alertLog.length === 0 && <p className="text-[#888888] p-4 text-center">No alerts to display.</p>}
        </div>
      </Card>
    </div>
  );
};

const HoneyActivityPage = ({ data }) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <div className="p-2"><p className="text-[#888888] text-xs font-[800] uppercase tracking-[0.1em]">Total Interactions</p><p className="text-[32px] font-bold font-mono text-white mt-2">{data.honeyLog.length}</p></div>
        </Card>
        <Card>
          <div className="p-2"><p className="text-[#888888] text-xs font-[800] uppercase tracking-[0.1em]">Active Traps</p><p className="text-[32px] font-bold font-mono text-[#A8E063] mt-2">{data.sessions.filter(s=>s.inHoney).length}</p></div>
        </Card>
      </div>

      <Card title="Live Deception Feed">
        <div className="space-y-3 font-mono text-sm">
          {data.honeyLog.map(h => (
            <div key={h.id} className="flex items-center gap-4 bg-[#2A2A2A] p-3 rounded-[16px] hover:bg-[#333] transition-colors">
              <span className="text-[#888888] text-xs w-20">{h.timestamp.split(' ')[1]}</span>
              <span className="text-white font-bold w-32 truncate">{h.attackerIP}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${h.action === 'LOGIN_ATTEMPT' ? 'bg-[#FF8C00] text-white' : 'bg-white text-black'}`}>
                {h.action}
              </span>
              <span className="text-[#888888] flex-1 truncate">→ <span className="text-white">{h.fakeTarget}</span></span>
              {h.fakeCredential && <span className="text-[#FF8C00] text-xs italic">[{h.fakeCredential}]</span>}
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${h.responseSimulated.includes('200') ? 'bg-[#A8E063] text-black' : 'bg-[#FF8C00] text-white'}`}>
                {h.responseSimulated}
              </span>
            </div>
          ))}
          {data.honeyLog.length === 0 && <div className="text-[#888888] p-4 text-center font-sans">No honey activity yet. Waiting for attackers...</div>}
        </div>
      </Card>
    </div>
  );
};

const DataVaultPage = ({ data }) => {
  const accessedFiles = useMemo(() => {
    const acc = new Set();
    data.honeyLog.forEach(h => acc.add(h.fakeTarget));
    return acc;
  }, [data.honeyLog]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-[800] uppercase tracking-[0.1em] text-white">Secure Data Vault</h2>
        <button className="px-5 py-2 bg-[#A8E063] text-black font-bold rounded-full text-sm flex items-center gap-2 hover:bg-opacity-80">
          <HardDrive size={16} /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {FAKE_FILES_INITIAL.map(file => {
          const isAccessed = accessedFiles.has(file);
          const ext = file.split('.').pop();
          const Icon = ext === 'pdf' ? FileText : ext === 'sql' ? Database : ext === 'json' ? Terminal : HardDrive;
          
          return (
            <div key={file} className={`relative bg-[#2A2A2A] p-6 rounded-[16px] flex flex-col items-center text-center group`}>
              {isAccessed && (
                <div className="absolute top-3 right-3">
                  <ShieldAlert size={16} className="text-[#FF8C00] animate-pulse" />
                </div>
              )}
              <Icon size={32} className={`mb-4 ${isAccessed ? 'text-[#FF8C00]' : 'text-white'}`} />
              <p className="font-mono text-sm text-white font-bold truncate w-full" title={file}>{file.split('/').pop()}</p>
              <Badge color={file.includes('config') || file.includes('id_rsa') || file.includes('passwd') ? 'red' : 'green'} className="mt-3">
                {file.includes('config') || file.includes('id_rsa') ? 'CONFIDENTIAL' : 'INTERNAL'}
              </Badge>
              {isAccessed && <p className="text-xs text-[#FF8C00] mt-3 font-bold">Accessed by Attacker</p>}
              
              <div className="absolute inset-0 bg-[#1A1A1A]/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[16px] gap-3">
                <button className="p-3 bg-[#242424] rounded-full hover:text-white text-[#888888]"><Eye size={18}/></button>
                <button className="p-3 bg-[#242424] rounded-full hover:text-[#A8E063] text-[#888888]"><Grid size={18}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SettingsPage = ({ engine, settings }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    engine.updateSettings(localSettings);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in">
      <Card title="Detection Thresholds" className="mb-6">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-2">Suspicious Threshold ({localSettings.suspiciousThreshold})</label>
            <input type="range" min="30" max="60" value={localSettings.suspiciousThreshold} 
              onChange={e => setLocalSettings({...localSettings, suspiciousThreshold: parseInt(e.target.value)})}
              className="w-full accent-[#FFFFFF]" />
          </div>
          <div>
            <label className="block text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-2">Attacker Threshold ({localSettings.attackerThreshold})</label>
            <input type="range" min="60" max="90" value={localSettings.attackerThreshold} 
              onChange={e => setLocalSettings({...localSettings, attackerThreshold: parseInt(e.target.value)})}
              className="w-full accent-[#FF8C00]" />
          </div>
          <div>
            <label className="block text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-2">Risk Decay Rate</label>
            <select value={localSettings.decayRate} onChange={e => setLocalSettings({...localSettings, decayRate: e.target.value})} className="bg-[#1A1A1A] text-white font-bold rounded-lg p-3 w-full border-none outline-none focus:ring-2 focus:ring-[#A8E063]">
              <option>Slow</option>
              <option>Normal</option>
              <option>Fast</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Auto-Response Engine">
        <div className="space-y-4">
          {Object.entries(localSettings.autoRules).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center bg-[#2A2A2A] p-4 rounded-[16px]">
              <span className="text-white font-bold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <button 
                onClick={() => setLocalSettings({...localSettings, autoRules: {...localSettings.autoRules, [key]: !val}})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-[#A8E063]' : 'bg-[#333]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`}/>
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <button onClick={handleSave} className="bg-[#A8E063] hover:bg-opacity-80 text-black px-8 py-3 rounded-full font-bold transition-colors">
          Save Configuration
        </button>
      </div>
    </div>
  );
};
