import React, { useState } from 'react';
import { ATTACK_TYPES } from '../../engine/constants';

export default function HeatmapPage({ data }) {
  // Heatmap 1: Hour vs Day (Last 7 Days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const timeGrid = Array(7).fill(0).map(() => Array(24).fill(0));
  let maxTimeValue = 1;

  data.attackLog.forEach(a => {
    const d = new Date(a.timestamp);
    const day = d.getDay();
    const hour = d.getHours();
    timeGrid[day][hour]++;
    if (timeGrid[day][hour] > maxTimeValue) maxTimeValue = timeGrid[day][hour];
  });

  // Heatmap 2: Attack Type vs Target Area
  const types = Object.values(ATTACK_TYPES).map(t => t.label);
  const targets = [...new Set(data.attackLog.map(a => a.targetArea))];
  if (targets.length === 0) targets.push('None');

  const typeTargetGrid = Array(types.length).fill(0).map(() => Array(targets.length).fill(0));
  let maxTypeValue = 1;

  data.attackLog.forEach(a => {
    const tIdx = types.indexOf(a.type);
    const tarIdx = targets.indexOf(a.targetArea);
    if (tIdx >= 0 && tarIdx >= 0) {
      typeTargetGrid[tIdx][tarIdx]++;
      if (typeTargetGrid[tIdx][tarIdx] > maxTypeValue) maxTypeValue = typeTargetGrid[tIdx][tarIdx];
    }
  });

  const getColor = (val, max) => {
    if (val === 0) return '#161B22';
    const intensity = 0.2 + (val / max) * 0.8;
    // Blend from dark to green to red based on intensity
    return `rgba(0, 255, 136, ${intensity})`; // Simple green scale for now, can be changed to heat colors
  };

  const getHeatColor = (val, max) => {
    if (val === 0) return '#161B22';
    const ratio = val / max;
    if (ratio < 0.3) return `rgba(0, 255, 136, ${ratio + 0.2})`; // Green
    if (ratio < 0.6) return `rgba(255, 193, 7, ${ratio + 0.2})`;  // Amber
    return `rgba(255, 68, 68, ${ratio + 0.2})`;                   // Red
  };

  const [tooltip, setTooltip] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Time Heatmap */}
      <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', position: 'relative' }}>
        <h3 style={{ margin: '0 0 20px', color: '#8B949E', fontSize: '14px' }}>Attack Activity by Hour × Day</h3>
        
        <div style={{ display: 'flex' }}>
          {/* Y Axis - Days */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '10px', color: '#8B949E', fontSize: '12px', marginTop: '20px' }}>
            {days.map(d => <div key={d} style={{ height: '30px', display: 'flex', alignItems: 'center' }}>{d}</div>)}
          </div>
          
          <div style={{ flex: 1 }}>
            {/* X Axis - Hours */}
            <div style={{ display: 'flex', marginBottom: '5px', color: '#8B949E', fontSize: '10px' }}>
              {hours.map(h => <div key={h} style={{ flex: 1, textAlign: 'center' }}>{h}</div>)}
            </div>
            
            {/* Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {days.map((d, dIdx) => (
                <div key={d} style={{ display: 'flex', gap: '2px' }}>
                  {hours.map(h => {
                    const val = timeGrid[dIdx][h];
                    return (
                      <div 
                        key={h}
                        onMouseEnter={(e) => setTooltip({ x: e.pageX, y: e.pageY, content: `${d} ${h}:00 - ${val} attacks` })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ 
                          flex: 1, height: '30px', background: getHeatColor(val, maxTimeValue), borderRadius: '4px',
                          border: val > 0 ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                          cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', fontSize: '12px', color: '#8B949E', justifyContent: 'flex-end' }}>
          <span>Low</span>
          <div style={{ width: '100px', height: '10px', background: 'linear-gradient(90deg, #161B22, rgba(0,255,136,0.5), rgba(255,193,7,0.8), rgba(255,68,68,1))', borderRadius: '4px' }} />
          <span>High</span>
        </div>
      </div>

      {/* Type vs Target Heatmap */}
      <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', border: '1px solid #30363D', position: 'relative' }}>
        <h3 style={{ margin: '0 0 20px', color: '#8B949E', fontSize: '14px' }}>Attack Type × Target Area</h3>
        
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {/* Y Axis - Types */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '10px', color: '#8B949E', fontSize: '11px', marginTop: '100px' }}>
            {types.map(t => <div key={t} style={{ height: '30px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t.substr(0,15)}</div>)}
          </div>
          
          <div style={{ flex: 1, minWidth: `${targets.length * 40}px` }}>
            {/* X Axis - Targets (Rotated) */}
            <div style={{ display: 'flex', marginBottom: '5px', color: '#8B949E', fontSize: '11px', height: '100px', position: 'relative' }}>
              {targets.map((t, i) => (
                <div key={t} style={{ width: '40px', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '10px', left: '20px', transform: 'rotate(-45deg)', transformOrigin: 'bottom left', whiteSpace: 'nowrap' }}>
                    {t}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {types.map((t, tIdx) => (
                <div key={t} style={{ display: 'flex', gap: '2px' }}>
                  {targets.map((tar, tarIdx) => {
                    const val = typeTargetGrid[tIdx][tarIdx];
                    return (
                      <div 
                        key={tar}
                        onMouseEnter={(e) => setTooltip({ x: e.pageX, y: e.pageY, content: `${t} → ${tar}: ${val} attacks` })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{ 
                          width: '38px', height: '30px', background: getHeatColor(val, maxTypeValue), borderRadius: '4px',
                          border: val > 0 ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                          cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 15, top: tooltip.y + 15,
          background: 'rgba(22, 27, 34, 0.95)', border: '1px solid #30363D', borderRadius: '6px',
          padding: '8px 12px', color: '#FFF', fontSize: '12px', zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {tooltip.content}
        </div>
      )}

    </div>
  );
}
