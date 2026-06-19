// part2.jsx
// ============================================================================
// UI COMPONENTS & PAGES
// ============================================================================

const Badge = ({ children, color = "gray", pulse = false, className = "" }) => {
  const colorMap = {
    green: "bg-[#A8E063] text-black",
    amber: "bg-transparent text-white border border-[#FF8C00]",
    red: "bg-[#FF8C00] text-white",
    gray: "bg-gray-700 text-gray-300",
    purple: "bg-[#A8E063] text-black",
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${colorMap[color]} ${pulse ? 'animate-pulse' : ''} ${className}`}>
      {children}
    </span>
  );
};

const Card = ({ title, children, rightAction = null, className = "" }) => (
  <div className={`bg-[#242424] rounded-[16px] p-[20px] flex flex-col ${className}`}>
    {title && (
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-[800] text-white tracking-[0.1em] text-xs uppercase">{title}</h3>
        {rightAction || <div className="text-gray-500 font-bold tracking-widest cursor-pointer">...</div>}
      </div>
    )}
    <div className="flex-1">
      {children}
    </div>
  </div>
);

const OverviewPage = ({ data }) => {
  const activeCount = data.sessions.length;
  const attackerCount = data.sessions.filter(s => s.state === "ATTACKER").length;
  const suspiciousCount = data.sessions.filter(s => s.state === "SUSPICIOUS").length;
  const honeyCount = data.honeyLog.length;
  const zeroDayCount = data.attackLog.filter(a => a.type === "Zero-Day Exploit").length;

  const riskDist = [
    { name: "NORMAL", value: activeCount - attackerCount - suspiciousCount, color: "#A8E063" },
    { name: "SUSPICIOUS", value: suspiciousCount, color: "#FF8C00" },
    { name: "ATTACKER", value: attackerCount, color: "#FFFFFF" }
  ];

  const typeFreq = useMemo(() => {
    const counts = {};
    data.attackLog.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.keys(counts).map(k => ({ type: k, count: counts[k] })).sort((a,b) => b.count - a.count).slice(0, 8);
  }, [data.attackLog]);

  const targetFreq = useMemo(() => {
    const counts = {};
    data.attackLog.forEach(a => { counts[a.targetArea] = (counts[a.targetArea] || 0) + 1; });
    return Object.keys(counts).map(k => ({ target: k, count: counts[k] })).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [data.attackLog]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-[32px] font-bold font-mono text-white flex items-center gap-2">{activeCount} <span className="text-[#A8E063] text-sm">▲</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Total Active</p>
            </div>
            <div>
              <p className="text-[32px] font-bold font-mono text-[#FF8C00] flex items-center gap-2">{attackerCount} <span className="text-[#FF8C00] text-sm">▼</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Attackers</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {[...Array(20)].map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < activeCount ? 'bg-[#A8E063]' : 'bg-[#333]'}`}></div>)}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-[32px] font-bold font-mono text-white flex items-center gap-2">{suspiciousCount} <span className="text-[#FF8C00] text-sm">▲</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Suspicious</p>
            </div>
            <div>
              <p className="text-[32px] font-bold font-mono text-white flex items-center gap-2">{honeyCount} <span className="text-[#A8E063] text-sm">▲</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Honey Trapped</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {[...Array(20)].map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < suspiciousCount ? 'bg-[#FF8C00]' : 'bg-[#333]'}`}></div>)}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-[32px] font-bold font-mono text-[#FF8C00] flex items-center gap-2">{zeroDayCount} <span className="text-[#FF8C00] text-sm">▲</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Zero-Day Alerts</p>
            </div>
            <div>
              <p className="text-[32px] font-bold font-mono text-white flex items-center gap-2">{data.alertLog.length} <span className="text-[#A8E063] text-sm">▲</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Total Alerts</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {[...Array(20)].map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < zeroDayCount ? 'bg-[#FF8C00]' : 'bg-[#333]'}`}></div>)}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-[32px] font-bold font-mono text-white flex items-center gap-2">{data.attackLog.length} <span className="text-[#FF8C00] text-sm">▲</span></p>
              <p className="text-[#888888] text-xs font-[400] mt-1">Total Attacks</p>
            </div>
          </div>
          <div className="mt-4 flex gap-1">
             <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden"><div className="h-full bg-[#FFFFFF]" style={{width: '70%'}}></div></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card title="Risk Distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDist} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#242424', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#888888' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Attack Types" className="col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeFreq} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888888" />
                <YAxis type="category" dataKey="type" stroke="#888888" width={100} tick={{ fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#242424', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#2A2A2A'}} />
                <Bar dataKey="count" fill="#FF8C00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Live Activity Feed" className="h-96">
          <div className="overflow-y-auto pr-2 space-y-3 h-full custom-scrollbar">
            {data.attackLog.slice(0, 20).map(log => (
              <div key={log.id} className="flex flex-col bg-[#2A2A2A] p-4 rounded-[16px] text-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-[400] text-[#888888] text-xs">{log.timestamp}</span>
                  <Badge color={log.severity === 'CRITICAL' ? 'red' : log.severity === 'HIGH' ? 'amber' : 'gray'}>{log.severity}</Badge>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <ShieldAlert size={14} className="text-[#FF8C00]" />
                  <span className="font-bold">{log.type}</span>
                  <span className="text-[#888888]">→</span>
                  <span className="text-[#FFFFFF] font-mono">{log.targetArea}</span>
                </div>
                <div className="text-[#888888] text-xs mt-2 font-mono">{log.sourceIP} ({log.sourceCountry})</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top Targeted Areas & Fingerprints" className="h-96">
          <div className="space-y-6 overflow-y-auto h-full pr-2 custom-scrollbar">
            <div>
              <h4 className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-4">Targets</h4>
              {targetFreq.map(t => (
                <div key={t.target} className="flex justify-between items-center bg-[#2A2A2A] p-3 rounded-[16px] mb-2">
                  <span className="text-white text-sm">{t.target}</span>
                  <span className="font-bold font-mono text-[#FF8C00]">{t.count} hits</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-[800] uppercase tracking-[0.1em] text-[#888888] mb-4">Active Fingerprints</h4>
              {data.sessions.slice(0,5).map(s => (
                <div key={s.id} className="flex justify-between items-center bg-[#2A2A2A] p-3 rounded-[16px] mb-2">
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-bold">{s.fingerprint.behaviorSignature}</span>
                    <span className="text-[#888888] text-xs font-[400]">Tool: {s.fingerprint.toolHint}</span>
                  </div>
                  <Badge color="gray">{s.id}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ActiveSessionsPage = ({ data, engine, role }) => {
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="space-y-4 animate-in fade-in">
      <Card title="Active Sessions">
        <div className="space-y-3">
          <div className="flex text-[#888888] text-xs font-[800] uppercase tracking-[0.1em] px-4">
            <div className="w-1/6">Session ID</div>
            <div className="w-1/4">IP Address</div>
            <div className="w-1/6">State</div>
            <div className="w-1/6">Risk</div>
            <div className="w-1/6">Duration</div>
            <div className="w-1/6 text-right">Actions</div>
          </div>
          {data.sessions.map(s => (
            <div key={s.id} className="flex flex-col bg-[#2A2A2A] rounded-[16px] overflow-hidden">
              <div className="flex items-center px-4 py-4 cursor-pointer hover:bg-[#333] transition-colors" onClick={() => toggleExpand(s.id)}>
                <div className="w-1/6 font-mono text-sm text-white font-bold">{s.id}</div>
                <div className="w-1/4">
                  <div className="text-white font-mono">{s.ip}</div>
                  <div className="text-xs text-[#888888] font-[400]">{s.country}</div>
                </div>
                <div className="w-1/6">
                  <Badge color={s.state === 'ATTACKER' ? 'red' : s.state === 'SUSPICIOUS' ? 'amber' : 'green'} pulse={s.state === 'ATTACKER'}>
                    {s.state}
                  </Badge>
                </div>
                <div className="w-1/6 flex items-center gap-2">
                  <span className={`font-bold text-2xl ${s.riskScore >= 70 ? 'text-[#FF8C00]' : s.riskScore >= 36 ? 'text-white' : 'text-[#A8E063]'}`}>
                    {s.riskScore}
                  </span>
                </div>
                <div className="w-1/6 font-mono text-sm text-white">{s.duration}s</div>
                <div className="w-1/6 text-right space-x-2 flex justify-end">
                  {role === 'ADMIN' && s.state === 'ATTACKER' && !s.inHoney && (
                    <button onClick={(e) => { e.stopPropagation(); engine.forceHoney(s.id); }} title="Force Honey" className="p-2 text-black bg-[#A8E063] rounded-full hover:bg-opacity-80">
                      <Grid size={14} />
                    </button>
                  )}
                  {role === 'ADMIN' && (
                    <button onClick={(e) => { e.stopPropagation(); engine.blockSession(s.id); }} title="Block IP" className="p-2 text-white bg-[#FF8C00] rounded-full hover:bg-opacity-80">
                      <ShieldOff size={14} />
                    </button>
                  )}
                  <div className="p-2 text-gray-400">
                    <ChevronRight size={16} className={`transform transition-transform ${expandedId === s.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
              {expandedId === s.id && (
                <div className="p-5 bg-[#242424] border-t border-[#333] flex gap-6">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-xs font-[800] uppercase tracking-[0.1em] text-white">Session Replay (Timeline)</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {s.timeline.map((t, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="font-mono text-[#888888] w-20 shrink-0">{t.timestamp.split(' ')[1]}</span>
                          <span className={`w-28 shrink-0 font-bold ${t.action.includes('Attack') ? 'text-[#FF8C00]' : t.action.includes('Honey') ? 'text-[#A8E063]' : 'text-white'}`}>{t.action}</span>
                          <span className="text-[#888888]">{t.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-80 space-y-4">
                    <h4 className="text-xs font-[800] uppercase tracking-[0.1em] text-white">Fingerprint & Metrics</h4>
                    <div className="bg-[#2A2A2A] rounded-[16px] p-4 text-sm space-y-3">
                      <div className="flex justify-between"><span className="text-[#888888]">Device Hash:</span> <span className="font-mono text-white font-bold">{s.fingerprint.deviceId}</span></div>
                      <div className="flex justify-between"><span className="text-[#888888]">Signature:</span> <span className="text-white font-bold">{s.fingerprint.behaviorSignature}</span></div>
                      <div className="flex justify-between"><span className="text-[#888888]">Pattern:</span> <span className="text-white font-bold">{s.fingerprint.requestPattern}</span></div>
                      <div className="flex justify-between"><span className="text-[#888888]">Tool Hint:</span> <span className="text-white font-bold">{s.fingerprint.toolHint}</span></div>
                    </div>
                    <h4 className="text-xs font-[800] uppercase tracking-[0.1em] text-white mt-4">Risk Sparkline</h4>
                    <div className="h-24 bg-[#2A2A2A] rounded-[16px] p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={s.riskHistory}>
                          <Line type="stepAfter" dataKey="score" stroke={s.riskScore >= 70 ? "#FF8C00" : "#FFFFFF"} strokeWidth={2} dot={false} isAnimationActive={false} />
                          <YAxis domain={[0, 100]} hide />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {data.sessions.length === 0 && (
            <div className="p-8 text-center text-[#888888]">No active sessions</div>
          )}
        </div>
      </Card>
    </div>
  );
};

const AttackIntelligencePage = ({ data }) => {
  const timelineData = useMemo(() => {
    const bins = {};
    data.attackLog.slice(0, 100).forEach(a => {
      const time = a.timestamp.substring(11, 16); 
      if (!bins[time]) bins[time] = { time, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      bins[time][a.severity]++;
    });
    return Object.values(bins).reverse();
  }, [data.attackLog]);

  const projectsTimelineData = useMemo(() => {
    const types = {};
    data.attackLog.forEach(a => {
      if (!types[a.type]) types[a.type] = { type: a.type, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      types[a.type][a.severity]++;
    });
    return Object.values(types).sort((a,b) => (b.CRITICAL + b.HIGH) - (a.CRITICAL + a.HIGH)).slice(0, 8);
  }, [data.attackLog]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <Card title="Attack Timeline (Severity)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectsTimelineData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
              <XAxis type="number" stroke="#888888" />
              <YAxis type="category" dataKey="type" stroke="#888888" width={120} tick={{ fontSize: 12 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#242424', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#2A2A2A'}} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#888888' }} />
              <Bar dataKey="LOW" stackId="a" fill="#A8E063" radius={[0, 0, 0, 0]} />
              <Bar dataKey="MEDIUM" stackId="a" fill="#FFFFFF" radius={[0, 0, 0, 0]} />
              <Bar dataKey="HIGH" stackId="a" fill="#FF8C00" radius={[0, 0, 0, 0]} />
              <Bar dataKey="CRITICAL" stackId="a" fill="#FF8C00" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Attack Correlation (Campaigns)">
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(data.attackLog.reduce((acc, log) => {
            if(!acc[log.correlationId]) acc[log.correlationId] = [];
            acc[log.correlationId].push(log);
            return acc;
          }, {})).slice(0,4).map(([corrId, attacks]) => (
            <div key={corrId} className="bg-[#2A2A2A] p-5 rounded-[16px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-bold text-sm">Campaign: <span className="font-mono">{corrId}</span></h4>
                  <p className="text-xs text-[#888888] font-mono mt-1">Source IP: {attacks[0].sourceIP}</p>
                </div>
                <Badge color="red">{attacks.length} Events</Badge>
              </div>
              <div className="text-sm text-[#888888] space-y-2">
                {attacks.slice(0,3).map(a => (
                  <div key={a.id} className="flex gap-3">
                    <span className="text-[#888888] font-mono w-16">{a.timestamp.split(' ')[1]}</span>
                    <span className="text-white font-bold">{a.type}</span>
                  </div>
                ))}
                {attacks.length > 3 && <div className="text-xs text-[#888888] italic mt-2">+ {attacks.length - 3} more...</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
