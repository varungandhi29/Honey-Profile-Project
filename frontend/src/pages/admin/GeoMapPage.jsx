import React, { useState, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup, Graticule } from 'react-simple-maps';
import { Crosshair, Activity, Globe, RefreshCcw } from 'lucide-react';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const TARGET = [73.1, 22.3]; // Vadodara, India

export default function GeoMapPage({ data, onBlockIP }) {
  const [tooltip, setTooltip] = useState(null);
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });
  const [attackLines, setAttackLines] = useState([]);

  // Calculate country attack intensity
  const countryStats = useMemo(() => {
    const stats = {};
    data.attackLog.forEach(a => {
      stats[a.sourceCountry] = (stats[a.sourceCountry] || 0) + 1;
    });
    return stats;
  }, [data.attackLog]);

  const maxAttacks = Math.max(...Object.values(countryStats), 1);

  // Active Attack Lines (fade out after 8s)
  useEffect(() => {
    const now = Date.now();
    const newLines = data.attackLog
      .filter(a => (now - new Date(a.timestamp).getTime()) < 8000)
      .map(a => {
        const session = data.sessions.find(s => s.id === a.sessionId);
        if (session && session.lng && session.lat) {
          return { id: a.id, from: [session.lng, session.lat], to: TARGET };
        }
        return null;
      }).filter(Boolean);
    setAttackLines(newLines);
  }, [data.attackLog, data.sessions]);

  const handleZoomIn = () => { if (position.zoom >= 4) return; setPosition(pos => ({ ...pos, zoom: pos.zoom * 2 })); };
  const handleZoomOut = () => { if (position.zoom <= 1) return; setPosition(pos => ({ ...pos, zoom: pos.zoom / 2 })); };
  const handleReset = () => { setPosition({ coordinates: [0, 20], zoom: 1 }); };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%', position: 'relative' }}>
      
      {/* MAP AREA */}
      <div style={{ flex: 3, background: '#060A10', borderRadius: '12px', border: '1px solid #30363D', overflow: 'hidden', position: 'relative' }}>
        
        {/* LIVE Badge */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #FF4444', padding: '4px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
          <div style={{ width: '8px', height: '8px', background: '#FF4444', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
          <span style={{ color: '#FF4444', fontWeight: 'bold', fontSize: '12px' }}>LIVE: {attackLines.length} ATTACKS</span>
        </div>

        {/* Map Controls */}
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
          <button onClick={handleZoomIn} style={{ width: '30px', height: '30px', background: '#161B22', color: '#FFF', border: '1px solid #30363D', borderRadius: '4px', cursor: 'pointer' }}>+</button>
          <button onClick={handleZoomOut} style={{ width: '30px', height: '30px', background: '#161B22', color: '#FFF', border: '1px solid #30363D', borderRadius: '4px', cursor: 'pointer' }}>-</button>
          <button onClick={handleReset} style={{ width: '30px', height: '30px', background: '#161B22', color: '#FFF', border: '1px solid #30363D', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCcw size={14} /></button>
        </div>

        <ComposableMap projection="geoNaturalEarth1" width={800} height={400} style={{ width: '100%', height: '100%' }}>
          <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={setPosition}>
            <Graticule stroke="#1C2128" />
            
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const count = countryStats[countryName] || 0;
                  const intensity = count > 0 ? 0.2 + (count / maxAttacks) * 0.8 : 0;
                  const fill = count > 0 ? `rgba(255, 68, 68, ${intensity})` : '#1A2030';
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke={count > 0 ? '#FF4444' : '#2D3748'}
                      strokeWidth={0.5}
                      onMouseEnter={() => setTooltip({ type: 'country', name: countryName, count })}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        hover: { fill: count > 0 ? '#FF4444' : '#30363D', outline: 'none' },
                        pressed: { fill: '#00FF88', outline: 'none' },
                        default: { outline: 'none' }
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Attack Lines */}
            {attackLines.map((line, i) => (
              <Line
                key={line.id + i}
                from={line.from}
                to={line.to}
                stroke="#FF4444"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                className="animated-dash"
                style={{ strokeLinecap: 'round' }}
              />
            ))}

            {/* Target Server Marker */}
            <Marker coordinates={TARGET}>
              <circle r={8} fill="rgba(0, 255, 136, 0.2)" />
              <circle r={4} fill="rgba(0, 255, 136, 0.5)" />
              <circle r={2} fill="#00FF88" />
              <text textAnchor="middle" y={15} style={{ fontFamily: 'monospace', fill: '#00FF88', fontSize: '8px', fontWeight: 'bold' }}>
                ◈ SERVER
              </text>
            </Marker>

            {/* Session Markers */}
            {data.sessions.map((s) => {
              if (!s.lng || !s.lat) return null;
              const isAttacker = s.state === 'ATTACKER';
              const color = isAttacker ? '#FF4444' : s.state === 'SUSPICIOUS' ? '#FFC107' : '#00FF88';
              
              return (
                <Marker 
                  key={s.id} 
                  coordinates={[s.lng, s.lat]}
                  onMouseEnter={() => setTooltip({ type: 'session', session: s })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {isAttacker && <circle r={6} fill="transparent" stroke={color} strokeWidth={1} className="pulse-ring" />}
                  <circle r={3} fill={color} />
                  {isAttacker && (
                    <text textAnchor="middle" y={-8} style={{ fill: '#FFF', fontSize: '6px', fontWeight: 'bold' }}>
                      {s.username}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <div style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #30363D', borderRadius: '8px', padding: '15px', color: '#FFF', zIndex: 20, backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            {tooltip.type === 'country' ? (
              <>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{tooltip.name}</div>
                <div style={{ fontSize: '12px', color: '#FF4444' }}>{tooltip.count} Attacks</div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{tooltip.session.username}</span>
                  <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', background: tooltip.session.state === 'ATTACKER' ? '#FF4444' : '#00FF88', color: '#000', fontWeight: 'bold' }}>
                    {tooltip.session.state}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#8B949E', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>IP: {tooltip.session.ip}</div>
                  <div>Loc: {tooltip.session.city}, {tooltip.session.country}</div>
                  <div>Device: {tooltip.session.os} / {tooltip.session.browser}</div>
                  <div>Risk: <span style={{ color: tooltip.session.riskScore >= 70 ? '#FF4444' : '#FFF' }}>{tooltip.session.riskScore}/100</span></div>
                  {tooltip.session.attackTypes?.length > 0 && (
                    <div style={{ marginTop: '5px', color: '#FFC107' }}>
                      Types: {tooltip.session.attackTypes.slice(0,2).join(', ')}
                    </div>
                  )}
                  <button onClick={() => onBlockIP(tooltip.session.ip, `Blocked from Geo Map — ${tooltip.session.state}`)}
                    style={{ marginTop:'8px', width:'100%', padding:'6px', background:'rgba(255,68,68,0.15)', color:'#FF4444', border:'1px solid rgba(255,68,68,0.3)', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:600 }}>
                    🚫 Block This IP
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {data.sessions.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 10, 16, 0.8)' }}>
            <div style={{ color: '#8B949E', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Globe size={48} />
              <span>Awaiting session data...</span>
            </div>
          </div>
        )}

        <style>{`
          .animated-dash { stroke-dashoffset: 8; animation: dash 1s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: 0; } }
          .pulse-ring { animation: pulseRing 1.5s infinite; transform-origin: center; }
          @keyframes pulseRing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
        `}</style>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#161B22', padding: '15px', borderRadius: '12px', border: '1px solid #30363D' }}>
            <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '5px' }}>Active Attackers</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF4444' }}>{data.sessions.filter(s=>s.state==='ATTACKER').length}</div>
          </div>
          <div style={{ background: '#161B22', padding: '15px', borderRadius: '12px', border: '1px solid #30363D' }}>
            <div style={{ fontSize: '11px', color: '#8B949E', marginBottom: '5px' }}>Total Attacks</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFF' }}>{data.attackLog.length}</div>
          </div>
        </div>

        <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px', color: '#8B949E', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} /> Top Origins
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {Object.entries(countryStats).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([country, count], i) => (
              <div key={country}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>{i+1}. {country}</span>
                  <span style={{ color: '#FF4444', fontWeight: 'bold' }}>{count}</span>
                </div>
                <div style={{ width: '100%', background: '#0D1117', height: '4px', borderRadius: '2px' }}>
                  <div style={{ width: `${(count/maxAttacks)*100}%`, background: '#FF4444', height: '100%', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
