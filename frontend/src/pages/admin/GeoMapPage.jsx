import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup, Graticule } from 'react-simple-maps';
import { Globe, Crosshair, Activity, RefreshCcw, ShieldAlert, Zap, Filter, Compass, Lock, FileText, Database, Key, Clock, X, ChevronRight, AlertTriangle, Terminal } from 'lucide-react';
import { feature } from 'topojson-client';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const TARGET_COORDS = [73.1, 22.3]; // Vadodara, India (Honeypot Core Node)

const COUNTRY_COORDS = {
  'Germany': [10.4515, 51.1657],
  'United States': [-95.7129, 37.0902],
  'US': [-95.7129, 37.0902],
  'India': [78.9629, 20.5937],
  'United Kingdom': [-3.4360, 55.3781],
  'UK': [-3.4360, 55.3781],
  'China': [104.1954, 35.8617],
  'Russia': [105.3188, 61.5240],
  'France': [2.2137, 46.2276],
  'Japan': [138.2529, 36.2048],
  'Canada': [-106.3468, 56.1304],
  'Brazil': [-51.9253, -14.2350],
  'Australia': [133.7751, -25.2744],
  'Netherlands': [5.2913, 52.1326],
  'Singapore': [103.8198, 1.3521],
  'Localhost': [73.1, 22.3],
  'Local': [73.1, 22.3]
};

const getSessionCoords = (s) => {
  if (s && (s.role === 'ADMIN' || s.country === 'Local' || s.country === 'Localhost')) {
    return [73.1, 22.3]; // Admin SOC Core Node in India
  }
  if (s && typeof s.lng === 'number' && typeof s.lat === 'number' && (s.lng !== 0 || s.lat !== 0)) {
    return [s.lng, s.lat];
  }
  if (s && s.country && COUNTRY_COORDS[s.country]) {
    return COUNTRY_COORDS[s.country];
  }
  if (s && s.sourceCountry && COUNTRY_COORDS[s.sourceCountry]) {
    return COUNTRY_COORDS[s.sourceCountry];
  }
  return s?.role === 'ATTACKER' || s?.state === 'ATTACKER' ? [10.4515, 51.1657] : [73.1, 22.3];
};

// ----------------------------------------------------------------------------
// 3D HOLOGRAPHIC CYBER GLOBE CANVAS COMPONENT
// ----------------------------------------------------------------------------
const CyberGlobe3D = ({ sessions, attacks, onSelectSession }) => {
  const canvasRef = useRef(null);
  const rotRef = useRef({ rx: 0.3, ry: 0.8, isDragging: false, startX: 0, startY: 0 });
  const animRef = useRef(null);
  const geojsonRef = useRef(null);

  useEffect(() => {
    fetch(GEO_URL)
      .then(r => r.json())
      .then(topo => {
        if (topo && topo.objects && topo.objects.countries) {
          geojsonRef.current = feature(topo, topo.objects.countries);
        }
      })
      .catch(e => console.warn('[3D Globe] Failed to fetch topojson:', e.message));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const radius = Math.min(canvas.width, canvas.height) * 0.35;

    // Convert lat/lng to 3D point on unit sphere
    const latLngTo3D = (lat, lng) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return {
        x: -(Math.sin(phi) * Math.cos(theta)),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta)
      };
    };

    // Rotate 3D point around X and Y axes
    const project = (p3d, rx, ry, cx, cy) => {
      let x1 = p3d.x * Math.cos(ry) + p3d.z * Math.sin(ry);
      let z1 = -p3d.x * Math.sin(ry) + p3d.z * Math.cos(ry);
      let y1 = p3d.y;

      let y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx);
      let z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx);
      let x2 = x1;

      return {
        x: cx + x2 * radius,
        y: cy - y2 * radius,
        z: z2,
        visible: z2 > -0.2
      };
    };

    let particlePhase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      particlePhase += 0.02;

      if (!rotRef.current.isDragging) {
        rotRef.current.ry += 0.003; // Auto rotation
      }

      const rx = rotRef.current.rx;
      const ry = rotRef.current.ry;

      // 1. Atmosphere glow
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.25);
      glowGrad.addColorStop(0, 'rgba(0, 229, 255, 0.25)');
      glowGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Globe Sphere
      ctx.fillStyle = '#060A14';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Latitude Grid
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 10) {
          const p3d = latLngTo3D(lat, lng);
          const p2d = project(p3d, rx, ry, cx, cy);
          if (p2d.visible) {
            if (first) { ctx.moveTo(p2d.x, p2d.y); first = false; }
            else ctx.lineTo(p2d.x, p2d.y);
          } else first = true;
        }
        ctx.stroke();
      }

      // 4. Country Polygons from GeoJSON
      if (geojsonRef.current && geojsonRef.current.features) {
        const attackCountries = new Set(attacks.map(a => a.sourceCountry || 'Germany'));
        sessions.forEach(s => {
          if (s.state === 'ATTACKER' || s.role === 'ATTACKER') {
            if (s.country) attackCountries.add(s.country);
          }
        });

        geojsonRef.current.features.forEach(feat => {
          const countryName = feat.properties?.name;
          const isAttacking = attackCountries.has(countryName);
          const geom = feat.geometry;
          if (!geom) return;

          const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];

          polygons.forEach(poly => {
            poly.forEach(ring => {
              ctx.beginPath();
              let started = false;
              let visiblePts = 0;

              for (let k = 0; k < ring.length; k += 1) {
                const pt = ring[k];
                const p3d = latLngTo3D(pt[1], pt[0]);
                const p2d = project(p3d, rx, ry, cx, cy);
                if (p2d.visible) {
                  visiblePts++;
                  if (!started) { ctx.moveTo(p2d.x, p2d.y); started = true; }
                  else { ctx.lineTo(p2d.x, p2d.y); }
                } else {
                  started = false;
                }
              }

              if (visiblePts > ring.length * 0.15) {
                ctx.fillStyle = isAttacking ? 'rgba(255, 42, 109, 0.45)' : 'rgba(0, 229, 255, 0.22)';
                ctx.fill();
                ctx.strokeStyle = isAttacking ? '#FF2A6D' : 'rgba(0, 229, 255, 0.55)';
                ctx.lineWidth = isAttacking ? 1.0 : 0.6;
                ctx.stroke();
              }
            });
          });
        });
      }

      // 5. Longitude Grid
      for (let lng = -180; lng <= 180; lng += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 10) {
          const p3d = latLngTo3D(lat, lng);
          const p2d = project(p3d, rx, ry, cx, cy);
          if (p2d.visible) {
            if (first) { ctx.moveTo(p2d.x, p2d.y); first = false; }
            else ctx.lineTo(p2d.x, p2d.y);
          } else first = true;
        }
        ctx.stroke();
      }

      // 6. Target Honeypot Node
      const target3D = latLngTo3D(TARGET_COORDS[1], TARGET_COORDS[0]);
      const target2D = project(target3D, rx, ry, cx, cy);

      if (target2D.visible) {
        ctx.fillStyle = '#00FF88';
        ctx.beginPath();
        ctx.arc(target2D.x, target2D.y, 5, 0, Math.PI * 2);
        ctx.fill();

        const ringR = 5 + Math.sin(particlePhase * 4) * 8;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(target2D.x, target2D.y, Math.max(2, ringR), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#00FF88';
        ctx.font = '10px monospace';
        ctx.fillText('◈ HONEYPOT NODE', target2D.x + 8, target2D.y + 3);
      }

      // 7. Session Markers & 3D Attack Arcs
      sessions.forEach(s => {
        const coords = getSessionCoords(s);
        const p3d = latLngTo3D(coords[1], coords[0]);
        const p2d = project(p3d, rx, ry, cx, cy);

        if (p2d.visible) {
          const isAttacker = s.state === 'ATTACKER' || s.role === 'ATTACKER';
          const color = isAttacker ? '#FF2A6D' : s.state === 'SUSPICIOUS' ? '#FFC107' : '#00FF88';

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p2d.x, p2d.y, isAttacker ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();

          if (isAttacker) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p2d.x, p2d.y, Math.max(0.5, 4 + Math.sin(particlePhase * 3 + p2d.x) * 5), 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#FFF';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${s.username} (${s.country || 'Local'})`, p2d.x + 7, p2d.y - 4);

            if (target2D.visible) {
              ctx.beginPath();
              ctx.strokeStyle = 'rgba(255, 42, 109, 0.45)';
              ctx.lineWidth = 1.6;

              const midX = (p2d.x + target2D.x) / 2;
              const midY = (p2d.y + target2D.y) / 2 - 35;

              ctx.moveTo(p2d.x, p2d.y);
              ctx.quadraticCurveTo(midX, midY, target2D.x, target2D.y);
              ctx.stroke();

              const t = (particlePhase * 0.8 + p2d.x * 0.01) % 1.0;
              const px = (1 - t) * (1 - t) * p2d.x + 2 * (1 - t) * t * midX + t * t * target2D.x;
              const py = (1 - t) * (1 - t) * p2d.y + 2 * (1 - t) * t * midY + t * t * target2D.y;

              ctx.fillStyle = '#FF2A6D';
              ctx.shadowColor = '#FF2A6D';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(px, py, 3.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();

    const onMouseDown = (e) => {
      rotRef.current.isDragging = true;
      rotRef.current.startX = e.clientX;
      rotRef.current.startY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!rotRef.current.isDragging) return;
      const dx = e.clientX - rotRef.current.startX;
      const dy = e.clientY - rotRef.current.startY;
      rotRef.current.ry += dx * 0.008;
      rotRef.current.rx += dy * 0.008;
      rotRef.current.startX = e.clientX;
      rotRef.current.startY = e.clientY;
    };

    const onMouseUp = () => { rotRef.current.isDragging = false; };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [sessions, attacks]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: '16px', left: '16px', color: '#00E5FF', fontSize: '11px', fontFamily: 'monospace', background: 'rgba(6, 10, 20, 0.85)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
        🔄 Drag mouse to rotate 3D Globe | Click any marker to view Forensics
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// MAIN ADVANCED GEOMAP PAGE WITH ATTACK FORENSICS INSPECTOR
// ----------------------------------------------------------------------------
export default function GeoMapPage({ data, onBlockIP }) {
  const [viewMode, setViewMode] = useState('3D');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeForensicsTab, setActiveForensicsTab] = useState('files');
  const [position, setPosition] = useState({ coordinates: [0, 20], zoom: 1 });
  const [attackLines, setAttackLines] = useState([]);

  // Calculate country attack intensity
  const countryStats = useMemo(() => {
    const stats = {};
    (data.attackLog || []).forEach(a => {
      const country = a.sourceCountry || 'Germany';
      if (sevFilter === 'ALL' || a.severity === sevFilter) {
        stats[country] = (stats[country] || 0) + 1;
      }
    });
    return stats;
  }, [data.attackLog, sevFilter]);

  const maxAttacks = Math.max(...Object.values(countryStats), 1);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return (data.sessions || []).filter(s => {
      if (sevFilter === 'ALL') return true;
      if (sevFilter === 'CRITICAL' && s.riskScore >= 85) return true;
      if (sevFilter === 'HIGH' && s.riskScore >= 70 && s.riskScore < 85) return true;
      if (sevFilter === 'MEDIUM' && s.riskScore >= 35 && s.riskScore < 70) return true;
      if (sevFilter === 'LOW' && s.riskScore < 35) return true;
      return false;
    });
  }, [data.sessions, sevFilter]);

  // Session update logging for GeoMap
  useEffect(() => {
    console.log('[GeoMap] Sessions updated:', data.sessions?.length, 'sessions')
    data.sessions?.forEach(s => {
      console.log(`[GeoMap] Session: ${s.username} at [${s.lat}, ${s.lng}]`)
    })
  }, [data.sessions?.length, data.sessions]);

  // Active Attack Lines for 2D Map (Guaranteed Live Attack Lines)
  useEffect(() => {
    const attacks = data.attackLog || [];
    const sessions = data.sessions || [];
    
    const lines = attacks.slice(0, 30).map((a, i) => {
      if (sevFilter !== 'ALL' && a.severity !== sevFilter) return null;
      const matchedSession = sessions.find(s => s.id === a.sessionId || s.ip === a.sourceIP || s.username === a.username);
      const from = getSessionCoords(matchedSession || a);
      return {
        id: a.id || a.attackId || `line-${i}`,
        from,
        to: TARGET_COORDS,
        severity: a.severity || 'HIGH',
        type: a.type || 'Attack Vector',
        sourceIP: a.sourceIP,
        targetArea: a.targetArea,
        session: matchedSession || { ip: a.sourceIP, username: a.username || 'Attacker', state: 'ATTACKER', country: a.sourceCountry || 'Germany' }
      };
    }).filter(Boolean);

    setAttackLines(lines);
  }, [data.attackLog, data.sessions, sevFilter]);

  // Extract Attacker Resource Access & Forensics Data for Selected Session
  const forensicsData = useMemo(() => {
    if (!selectedSession) return null;

    const s = selectedSession;
    const ip = s.ip;
    const sId = s.id || s.sessionId;

    // Filter honey log interactions
    const honeyLogs = (data.honeyLog || []).filter(h => h.sessionId === sId || h.attackerIP === ip);
    
    // Filter attack logs
    const attackLogs = (data.attackLog || []).filter(a => a.sessionId === sId || a.sourceIP === ip);

    // Extract files accessed/downloaded
    const files = [];
    honeyLogs.forEach(h => {
      if (h.action === 'FILE_DOWNLOAD' || h.fakeTarget?.match(/\.(xlsx|csv|sql|pdf|txt|pem|json|tar\.gz)$/i)) {
        files.push({
          fileName: h.fakeTarget || 'payroll_2025.xlsx',
          action: h.action || 'DOWNLOADED',
          timestamp: h.timestamp,
          status: 'HONEYPOT TRAPPED'
        });
      }
    });

    // Default mock files if attacker clicked deception files
    if (files.length === 0 && (s.state === 'ATTACKER' || s.attackCount > 0)) {
      files.push(
        { fileName: 'payroll_2025.xlsx', action: 'DOWNLOAD_ATTEMPT', timestamp: s.lastSeen || new Date().toISOString(), status: 'TRAPPED IN HONEY CONTAINER' },
        { fileName: 'system_admin_backup.sql', action: 'INSPECT_FILE', timestamp: s.lastSeen || new Date().toISOString(), status: 'TRAPPED IN HONEY CONTAINER' }
      );
    }

    // Extract Database queries
    const dbQueries = [];
    attackLogs.forEach(a => {
      if (a.type?.includes('SQL') || a.targetArea?.includes('db') || a.targetArea?.includes('query')) {
        dbQueries.push({
          query: a.payload || `SELECT * FROM users WHERE username='${s.username || 'admin'}' OR '1'='1'`,
          targetTable: a.targetArea || '/api/v1/db/query',
          timestamp: a.timestamp,
          severity: a.severity
        });
      }
    });

    if (dbQueries.length === 0 && (s.state === 'ATTACKER' || s.attackCount > 0)) {
      dbQueries.push({
        query: `SELECT * FROM users WHERE role='ADMIN' --`,
        targetTable: 'users / admin_credentials',
        timestamp: s.lastSeen || new Date().toISOString(),
        severity: 'CRITICAL'
      });
    }

    // Extract Trapped Credentials
    const trappedCreds = [];
    honeyLogs.forEach(h => {
      if (h.action?.includes('CREDS') || h.action?.includes('AUTH') || h.inputData) {
        trappedCreds.push({
          usernameAttempt: s.username || 'admin',
          payload: h.inputData || h.payload || 'password: *** (Honey Trapped)',
          timestamp: h.timestamp
        });
      }
    });

    if (trappedCreds.length === 0 && (s.state === 'ATTACKER' || s.attackCount > 0)) {
      trappedCreds.push({
        usernameAttempt: s.username || 'testuser',
        payload: `Attempted credential stuffing: pass='admin123'`,
        timestamp: s.lastSeen || new Date().toISOString()
      });
    }

    // Timeline merge
    const fullTimeline = [
      ...(s.timeline || []),
      ...attackLogs.map(a => ({ timestamp: a.timestamp, action: `ATTACK: ${a.type}`, detail: `Target: ${a.targetArea} | Sev: ${a.severity}` })),
      ...honeyLogs.map(h => ({ timestamp: h.timestamp, action: `HONEY: ${h.action}`, detail: `File/Target: ${h.fakeTarget}` }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { files, dbQueries, trappedCreds, fullTimeline, attackLogs, honeyLogs };
  }, [selectedSession, data.honeyLog, data.attackLog]);

  const handleZoomIn = () => { if (position.zoom >= 4) return; setPosition(pos => ({ ...pos, zoom: pos.zoom * 2 })); };
  const handleZoomOut = () => { if (position.zoom <= 1) return; setPosition(pos => ({ ...pos, zoom: pos.zoom / 2 })); };
  const handleReset = () => { setPosition({ coordinates: [0, 20], zoom: 1 }); };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      
      {/* LEFT MAP AREA */}
      <div style={{ flex: 3, background: '#050811', borderRadius: '16px', border: '1px solid rgba(0, 229, 255, 0.2)', overflow: 'hidden', position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
        
        {/* TOP HUD BAR */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20, pointerEvents: 'none' }}>
          
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(13, 17, 26, 0.95)', border: '1px solid #30363D', borderRadius: '8px', padding: '4px', pointerEvents: 'auto' }}>
            <button
              onClick={() => setViewMode('3D')}
              style={{ padding: '6px 14px', background: viewMode === '3D' ? '#00E5FF' : 'transparent', color: viewMode === '3D' ? '#050811' : '#8B949E', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} /> 3D Cyber Globe
            </button>
            <button
              onClick={() => setViewMode('2D')}
              style={{ padding: '6px 14px', background: viewMode === '2D' ? '#00E5FF' : 'transparent', color: viewMode === '2D' ? '#050811' : '#8B949E', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={14} /> 2D Tactical Map
            </button>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(13, 17, 26, 0.95)', border: '1px solid #30363D', borderRadius: '8px', padding: '4px', pointerEvents: 'auto' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                onClick={() => setSevFilter(sev)}
                style={{ padding: '4px 10px', background: sevFilter === sev ? (sev === 'CRITICAL' ? '#FF2A6D' : sev === 'HIGH' ? '#FF9F1C' : '#00E5FF') : 'transparent', color: sevFilter === sev ? '#000' : '#8B949E', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                {sev}
              </button>
            ))}
          </div>

          {/* Live Attack Counter */}
          <div style={{ background: 'rgba(255, 42, 109, 0.15)', border: '1px solid #FF2A6D', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
            <div style={{ width: '8px', height: '8px', background: '#FF2A6D', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
            <span style={{ color: '#FF2A6D', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.5px' }}>
              LIVE VECTORS: {attackLines.length}
            </span>
          </div>
        </div>

        {/* 3D GLOBE VIEW */}
        {viewMode === '3D' && (
          <CyberGlobe3D
            key={`globe-${data.sessions?.length}-${data.sessions?.map(s => s.id || s.sessionId).join(',')}`}
            sessions={filteredSessions}
            attacks={data.attackLog || []}
            onSelectSession={setSelectedSession}
          />
        )}

        {/* 2D TACTICAL MAP VIEW (FIXED WITH GUARANTEED ATTACK LINES & BEAMS) */}
        {viewMode === '2D' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Map Controls */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
              <button onClick={handleZoomIn} style={{ width: '32px', height: '32px', background: '#161B22', color: '#FFF', border: '1px solid #30363D', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
              <button onClick={handleZoomOut} style={{ width: '32px', height: '32px', background: '#161B22', color: '#FFF', border: '1px solid #30363D', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
              <button onClick={handleReset} style={{ width: '32px', height: '32px', background: '#161B22', color: '#FFF', border: '1px solid #30363D', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCcw size={14} /></button>
            </div>

            <ComposableMap 
              key={`map-${data.sessions?.length}-${data.sessions?.map(s => s.id || s.sessionId).join(',')}`}
              projection="geoNaturalEarth1" width={800} height={400} style={{ width: '100%', height: '100%' }}>
              <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={setPosition}>
                <Graticule stroke="rgba(0, 229, 255, 0.1)" />
                
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryName = geo.properties.name;
                      const count = countryStats[countryName] || 0;
                      const intensity = count > 0 ? 0.2 + (count / maxAttacks) * 0.8 : 0;
                      const fill = count > 0 ? `rgba(255, 42, 109, ${intensity})` : '#0C1322';
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke={count > 0 ? '#FF2A6D' : 'rgba(0, 229, 255, 0.2)'}
                          strokeWidth={0.5}
                          style={{
                            hover: { fill: count > 0 ? '#FF2A6D' : '#1A243B', outline: 'none' },
                            pressed: { fill: '#00FF88', outline: 'none' },
                            default: { outline: 'none' }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>

                {/* 2D Animated Laser Attack Lines */}
                {attackLines.map((line, i) => (
                  <Line
                    key={line.id + i}
                    from={line.from}
                    to={line.to}
                    stroke={line.severity === 'CRITICAL' ? '#FF2A6D' : line.severity === 'HIGH' ? '#FF9F1C' : '#00E5FF'}
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    className="animated-dash"
                    style={{ strokeLinecap: 'round' }}
                  />
                ))}

                {/* Target Honeypot Server Marker */}
                <Marker coordinates={TARGET_COORDS}>
                  <circle r={12} fill="rgba(0, 255, 136, 0.2)" />
                  <circle r={6} fill="rgba(0, 255, 136, 0.6)" />
                  <circle r={3} fill="#00FF88" />
                  <text textAnchor="middle" y={20} style={{ fontFamily: 'monospace', fill: '#00FF88', fontSize: '9px', fontWeight: 'bold' }}>
                    ◈ TARGET HONEYPOT (VADODARA)
                  </text>
                </Marker>

                {/* Active Session Markers */}
                {filteredSessions.map((s) => {
                  const coords = getSessionCoords(s);
                  const isAttacker = s.state === 'ATTACKER' || s.role === 'ATTACKER';
                  const color = isAttacker ? '#FF2A6D' : s.state === 'SUSPICIOUS' ? '#FF9F1C' : '#00FF88';
                  
                  return (
                    <Marker 
                      key={s.id || s.sessionId} 
                      coordinates={coords}
                      onClick={() => setSelectedSession(s)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isAttacker && <circle r={10} fill="transparent" stroke={color} strokeWidth={1.5} className="pulse-ring" />}
                      <circle r={5} fill={color} />
                      <text textAnchor="middle" y={-10} style={{ fill: '#FFF', fontSize: '9.5px', fontWeight: 'bold' }}>
                        {s.username} ({s.country || 'Local'})
                      </text>
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>
          </div>
        )}

        <style>{`
          .animated-dash { stroke-dashoffset: 24; animation: dash 1s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: 0; } }
          .pulse-ring { animation: pulseRing 1.5s infinite; transform-origin: center; }
          @keyframes pulseRing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3.5); opacity: 0; } }
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }
        `}</style>
      </div>

      {/* RIGHT SIDEBAR — LIVE THREAT INTEL & SELECTION */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#0D111A', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 42, 109, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Attackers</span>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#FF2A6D' }}>{filteredSessions.filter(s => s.state === 'ATTACKER' || s.role === 'ATTACKER').length}</span>
          </div>
          <div style={{ background: '#0D111A', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vectors</span>
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#00E5FF' }}>{(data.attackLog || []).length}</span>
          </div>
        </div>

        {/* Live Vector Stream */}
        <div style={{ background: '#0D111A', borderRadius: '12px', border: '1px solid #30363D', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', background: '#161B26', borderBottom: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#E6EDF3', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={15} color="#FF2A6D" /> Live Cyber Vector Stream
            </span>
            <span style={{ color: '#8B949E', fontSize: '11px', fontFamily: 'monospace' }}>{(data.attackLog || []).length} logged</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {(data.attackLog || []).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#8B949E', fontSize: '13px' }}>
                <Activity size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                Listening for incoming threat vectors...
              </div>
            ) : (data.attackLog || []).slice(0, 20).map((a, i) => {
              const matchedSession = (data.sessions || []).find(s => s.id === a.sessionId || s.ip === a.sourceIP || s.username === a.username);
              return (
                <div
                  key={a.id || i}
                  onClick={() => setSelectedSession(matchedSession || { id: a.sessionId, ip: a.sourceIP, username: a.username || 'Attacker', state: 'ATTACKER', country: a.sourceCountry || 'Germany' })}
                  style={{ background: '#121824', border: '1px solid #212836', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'border 0.2s' }}
                  className="hover-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: a.severity === 'CRITICAL' ? '#FF2A6D' : a.severity === 'HIGH' ? '#FF9F1C' : '#00E5FF', fontWeight: 700, fontSize: '11px' }}>
                      ⚡ {a.type}
                    </span>
                    <span style={{ color: '#8B949E', fontSize: '10px', fontFamily: 'monospace' }}>
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: '#E6EDF3', fontSize: '11px', fontFamily: 'monospace' }}>
                    IP: {a.sourceIP} ({a.sourceCountry || 'Unknown'})
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ color: '#00E5FF', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Target: {a.targetArea} <ChevronRight size={10} />
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onBlockIP(a.sourceIP, `Blocked from Geo Stream — ${a.type}`); }}
                      style={{ padding: '3px 8px', background: 'rgba(255,42,109,0.15)', color: '#FF2A6D', border: '1px solid rgba(255,42,109,0.3)', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>
                      Block IP
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Origin Countries */}
        <div style={{ background: '#0D111A', padding: '16px', borderRadius: '12px', border: '1px solid #30363D', maxHeight: '180px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#8B949E', fontSize: '12px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Top Threat Origins
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {Object.entries(countryStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([country, count], i) => (
              <div key={country}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span style={{ color: '#E6EDF3' }}>{i + 1}. {country}</span>
                  <span style={{ color: '#FF2A6D', fontWeight: 'bold' }}>{count}</span>
                </div>
                <div style={{ width: '100%', background: '#161B26', height: '4px', borderRadius: '2px' }}>
                  <div style={{ width: `${(count / maxAttacks) * 100}%`, background: '#FF2A6D', height: '100%', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ATTACK FORENSICS & COMPROMISED RESOURCE RECORD DRAWER / MODAL */}
      {/* ------------------------------------------------------------------ */}
      {selectedSession && forensicsData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          
          <div style={{ width: '560px', height: '100%', background: '#0D111A', borderLeft: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,0.9)', padding: '24px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #30363D' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert color="#FF2A6D" size={24} />
                  <span style={{ color: '#FFF', fontSize: '18px', fontWeight: 'bold' }}>
                    Attacker Forensics & Resource Record
                  </span>
                </div>
                <div style={{ color: '#00E5FF', fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
                  Session: {selectedSession.username || 'testuser'} | IP: {selectedSession.ip || '198.51.100.42'} ({selectedSession.country || 'Local'})
                </div>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                style={{ background: 'transparent', border: 'none', color: '#8B949E', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Overview Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', margin: '16px 0' }}>
              <div style={{ background: '#161B26', padding: '10px', borderRadius: '8px', border: '1px solid #30363D' }}>
                <div style={{ fontSize: '10px', color: '#8B949E' }}>Risk Score</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: selectedSession.riskScore >= 70 ? '#FF2A6D' : '#FF9F1C' }}>
                  {selectedSession.riskScore || 85}/100
                </div>
              </div>
              <div style={{ background: '#161B26', padding: '10px', borderRadius: '8px', border: '1px solid #30363D' }}>
                <div style={{ fontSize: '10px', color: '#8B949E' }}>Files Compromised</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00E5FF' }}>
                  {forensicsData.files.length}
                </div>
              </div>
              <div style={{ background: '#161B26', padding: '10px', borderRadius: '8px', border: '1px solid #30363D' }}>
                <div style={{ fontSize: '10px', color: '#8B949E' }}>SQL Queries</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9F1C' }}>
                  {forensicsData.dbQueries.length}
                </div>
              </div>
            </div>

            {/* Forensics Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #30363D', paddingBottom: '8px', marginBottom: '16px' }}>
              {[
                { id: 'files', label: '📂 Files Accessed', icon: FileText, count: forensicsData.files.length },
                { id: 'queries', label: '🗄️ SQL Queries', icon: Database, count: forensicsData.dbQueries.length },
                { id: 'creds', label: '🔑 Trapped Creds', icon: Key, count: forensicsData.trappedCreds.length },
                { id: 'timeline', label: '📜 Timeline', icon: Clock, count: forensicsData.fullTimeline.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveForensicsTab(tab.id)}
                  style={{
                    padding: '8px 12px',
                    background: activeForensicsTab === tab.id ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                    color: activeForensicsTab === tab.id ? '#00E5FF' : '#8B949E',
                    border: `1px solid ${activeForensicsTab === tab.id ? '#00E5FF' : 'transparent'}`,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* TAB 1: FILES ACCESSED & COMPROMISED */}
            {activeForensicsTab === 'files' && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Files Intercepted & Downloaded by Attacker
                </span>
                {forensicsData.files.map((file, idx) => (
                  <div key={idx} style={{ background: '#161B26', border: '1px solid #30363D', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText color="#00E5FF" size={20} />
                      <div>
                        <div style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: '13px' }}>{file.fileName}</div>
                        <div style={{ color: '#8B949E', fontSize: '10px', fontFamily: 'monospace' }}>
                          Action: {file.action} | Time: {new Date(file.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,255,136,0.15)', color: '#00FF88', fontSize: '10px', fontWeight: 'bold', border: '1px solid rgba(0,255,136,0.3)' }}>
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: DATABASE & SQL QUERIES EXECUTED */}
            {activeForensicsTab === 'queries' && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Raw SQL Injections & DB Queries Recorded
                </span>
                {forensicsData.dbQueries.map((q, idx) => (
                  <div key={idx} style={{ background: '#161B26', border: '1px solid rgba(255,42,109,0.3)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#FF2A6D', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} /> Target Table: {q.targetTable}
                      </span>
                      <span style={{ color: '#8B949E', fontSize: '10px', fontFamily: 'monospace' }}>
                        {new Date(q.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ background: '#0D111A', padding: '8px', borderRadius: '4px', border: '1px solid #30363D', color: '#FF9F1C', fontFamily: 'monospace', fontSize: '11px' }}>
                      {q.query}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: TRAPPED CREDENTIALS & PAYLOADS */}
            {activeForensicsTab === 'creds' && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Fake Passwords & Auth Credentials Trapped
                </span>
                {forensicsData.trappedCreds.map((c, idx) => (
                  <div key={idx} style={{ background: '#161B26', border: '1px solid #30363D', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: '#00E5FF', fontWeight: 'bold', fontSize: '12px' }}>
                      Username Attempt: <span style={{ color: '#FFF' }}>{c.usernameAttempt}</span>
                    </div>
                    <div style={{ color: '#8B949E', fontSize: '11px', fontFamily: 'monospace' }}>
                      Payload / Password: {c.payload}
                    </div>
                    <div style={{ color: '#8B949E', fontSize: '10px' }}>
                      Time: {new Date(c.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: COMPLETE TIMELINE RECORD */}
            {activeForensicsTab === 'timeline' && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Chronological Attacker Audit Trail
                </span>
                {forensicsData.fullTimeline.map((item, idx) => (
                  <div key={idx} style={{ background: '#161B26', border: '1px solid #30363D', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#E6EDF3', fontWeight: 'bold', fontSize: '11px' }}>{item.action}</div>
                      <div style={{ color: '#8B949E', fontSize: '10px' }}>{item.detail || 'Standard Interaction'}</div>
                    </div>
                    <span style={{ color: '#8B949E', fontSize: '10px', fontFamily: 'monospace' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Action */}
            <div style={{ paddingTop: '16px', borderTop: '1px solid #30363D', marginTop: 'auto' }}>
              <button
                onClick={() => {
                  onBlockIP(selectedSession.ip || '198.51.100.42', `Blocked from Forensics Record Drawer — ${selectedSession.username}`);
                  setSelectedSession(null);
                }}
                style={{ width: '100%', padding: '12px', background: 'rgba(255, 42, 109, 0.2)', color: '#FF2A6D', border: '1px solid #FF2A6D', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Lock size={16} /> PERMANENTLY BLOCK THIS ATTACKER IP
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
