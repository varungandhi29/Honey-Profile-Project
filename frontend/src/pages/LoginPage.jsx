import { useState, useEffect, useRef } from 'react';
import { Shield, Lock, User } from 'lucide-react';

const NeuralBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    const nodes = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      color: Math.random() > 0.5 ? '#00FF88' : '#FF9900'
    }));

    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 4 + 2,
      vy: Math.random() * -1 - 0.5
    }));

    let scanY = 0;

    const render = () => {
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw scan line
      scanY += 2;
      if (scanY > canvas.height) scanY = 0;
      ctx.fillStyle = 'rgba(0, 255, 136, 0.05)';
      ctx.fillRect(0, scanY, canvas.width, 100);

      // Draw lines between nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.2 * (1 - dist / 150)})`;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
        
        ctx.beginPath();
        ctx.fillStyle = node.color;
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = node.color;
      });
      ctx.shadowBlur = 0;

      // Draw particles
      ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
      particles.forEach(p => {
        p.y += p.vy;
        if (p.y < 0) p.y = canvas.height;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      requestAnimationFrame(render);
    };
    render();

    return () => window.removeEventListener('resize', setSize);
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }} />;
};

export default function LoginPage({ onLogin, loginError }) {
  const [username, setUsername] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('user') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;
    setLoading(true);
    try {
      await onLogin({ username: username.trim(), password: password.trim() });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <NeuralBackground />
      
      <div style={{
        background: 'rgba(22, 27, 34, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 0 60px rgba(0, 255, 136, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#00FF88',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#000'
        }}>
          <Shield size={32} />
        </div>
        
        <h1 style={{ color: '#E6EDF3', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
          HONEYSHIELD V2
        </h1>
        <p style={{ color: '#8B949E', marginBottom: '30px', fontSize: '14px' }}>Secure Deception & Intelligence Platform</p>

        {loginError && (
          <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #FF4444', color: '#FF4444', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            ⚠️ {loginError}
          </div>
        )}

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <User style={{ position: 'absolute', top: '12px', left: '12px', color: '#8B949E' }} size={20} />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              background: '#0D1117',
              border: '1px solid #30363D',
              borderRadius: '8px',
              color: '#FFF',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00FF88'}
            onBlur={(e) => e.target.style.borderColor = '#30363D'}
          />
        </div>

        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <Lock style={{ position: 'absolute', top: '12px', left: '12px', color: '#8B949E' }} size={20} />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              background: '#0D1117',
              border: '1px solid #30363D',
              borderRadius: '8px',
              color: '#FFF',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00FF88'}
            onBlur={(e) => e.target.style.borderColor = '#30363D'}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !username.trim() || !password.trim()}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#30363D' : '#00FF88',
            color: loading ? '#8B949E' : '#0D1117',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: loading || !username.trim() || !password.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 0 #00CC6A'
          }}
          onMouseDown={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(4px)';
              e.target.style.boxShadow = '0 0 0 #00CC6A';
            }
          }}
          onMouseUp={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 0 #00CC6A';
            }
          }}
        >
          {loading ? 'AUTHENTICATING...' : 'LOGIN'}
        </button>

        <div style={{ marginTop: '24px', fontSize: '12px', color: '#8B949E', textAlign: 'left', background: '#0D1117', padding: '10px', borderRadius: '8px' }}>
          <div><strong>Demo Credentials:</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Admin: admin / admin123</span>
            <span>User: user / user123</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Attacker: testuser / testuser123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
