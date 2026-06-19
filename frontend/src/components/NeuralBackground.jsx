import { useRef, useEffect } from 'react'

const NeuralBackground = () => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const nodes = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      color: i < 64 ? '#00FF88' : '#FF8C00'
    }))
    const squares = Array.from({ length: 30 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 2, speed: 0.3 + Math.random() * 0.5,
      opacity: 0.3 + Math.random() * 0.5,
      color: ['#00FF88','#FF8C00','#4FC3F7'][Math.floor(Math.random()*3)]
    }))
    let scanY = 0
    const draw = () => {
      ctx.fillStyle = '#0D1117'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i+1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx*dx+dy*dy)
          if (dist < 150) {
            const op = (1 - dist/150) * 0.3
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0,255,136,${op})`
            ctx.lineWidth = 0.5
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, 2, 0, Math.PI*2)
        ctx.fillStyle = n.color === '#00FF88' ? 'rgba(0,255,136,0.7)' : 'rgba(255,140,0,0.7)'
        ctx.fill()
      })
      squares.forEach(s => {
        s.y -= s.speed
        if (s.y < 0) s.y = canvas.height
        ctx.globalAlpha = s.opacity
        ctx.fillStyle = s.color
        ctx.fillRect(s.x, s.y, s.size, s.size)
      })
      ctx.globalAlpha = 1
      scanY = (scanY + canvas.height/240) % canvas.height
      const grad = ctx.createLinearGradient(0, scanY-20, 0, scanY+20)
      grad.addColorStop(0, 'rgba(0,255,136,0)')
      grad.addColorStop(0.5, 'rgba(0,255,136,0.07)')
      grad.addColorStop(1, 'rgba(0,255,136,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, scanY-20, canvas.width, 40)
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:0 }} />
}

export default NeuralBackground
