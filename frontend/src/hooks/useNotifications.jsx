import { useState, useCallback } from 'react'
export const useNotifications = () => {
  const [toasts, setToasts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const addToast = useCallback((msg, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-3), { id, msg, type }])
    if (type !== 'critical') setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration)
    if (['critical','warning'].includes(type)) setUnreadCount(c => c + 1)
    if (type === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 HoneyShield Alert', { body: msg, tag: 'hs-alert' })
    }
  }, [])
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  const clearUnread = useCallback(() => setUnreadCount(0), [])
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
  }, [])
  const ToastContainer = () => (
    <div style={{ position:'fixed', top:'70px', right:'16px', zIndex:9999, display:'flex', flexDirection:'column', gap:'8px', maxWidth:'380px' }}>
      {toasts.map(t => {
        const c = { critical:{bg:'#3D0000',border:'#FF4444',color:'#FF4444'}, warning:{bg:'#2D2000',border:'#FFC107',color:'#FFC107'}, success:{bg:'#162614',border:'#00FF88',color:'#00FF88'}, info:{bg:'#161B22',border:'#30363D',color:'#E6EDF3'} }[t.type] || { bg:'#161B22',border:'#30363D',color:'#E6EDF3' }
        return (
          <div key={t.id} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:'10px', padding:'12px 16px', color:c.color, fontSize:'13px', boxShadow:'0 4px 20px rgba(0,0,0,0.5)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', animation:'slideIn 0.3s ease' }}>
            <span style={{ flex:1, lineHeight:1.5 }}>{t.msg}</span>
            <button onClick={() => removeToast(t.id)} style={{ background:'none', border:'none', color:c.color, fontSize:'18px', cursor:'pointer', marginLeft:'8px', opacity:0.7, lineHeight:1 }}>×</button>
          </div>
        )
      })}
      <style>{`@keyframes slideIn { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }`}</style>
    </div>
  )
  return { addToast, removeToast, clearUnread, unreadCount, ToastContainer, requestPermission }
}
