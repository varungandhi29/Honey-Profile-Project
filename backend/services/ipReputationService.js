const DATACENTER_RANGES = [
  '3.0.0.0/8','13.0.0.0/8','18.0.0.0/8','34.0.0.0/8','35.0.0.0/8',
  '52.0.0.0/8','54.0.0.0/8','99.0.0.0/8',
  '13.64.0.0/11','13.96.0.0/13','20.0.0.0/8','40.64.0.0/10',
  '23.96.0.0/13','40.112.0.0/13','65.52.0.0/14',
  '34.64.0.0/10','34.128.0.0/10','35.184.0.0/13','35.192.0.0/14',
  '185.220.0.0/16','185.107.0.0/16','199.249.0.0/16',
  '104.16.0.0/13','172.64.0.0/13','162.158.0.0/15',
]
const TOR_EXIT_NODES = new Set([
  '185.220.101.42','185.220.101.43','185.220.101.44','185.220.101.45',
  '185.220.101.46','185.220.101.47','185.220.101.48','185.220.101.49',
  '199.249.230.87','199.249.230.88','199.249.230.89',
  '45.33.32.156','37.187.129.166','193.218.118.234',
])
const PRIVATE_RANGES = ['127.','10.','192.168.','172.16.','172.17.','172.18.','172.19.','172.20.','172.21.','172.22.','172.23.','172.24.','172.25.','172.26.','172.27.','172.28.','172.29.','172.30.','172.31.','0.','::1']

const ipToNumber = (ip) => {
  const parts = ip.split('.')
  if (parts.length !== 4) return 0
  return parts.reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0
}
const isInCidr = (ip, cidr) => {
  try {
    const [range, bits] = cidr.split('/')
    const mask = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0
    return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask)
  } catch { return false }
}

export const checkIPReputation = (ip) => {
  if (!ip) return { suspicious: false, reason: null, riskBonus: 0 }
  if (PRIVATE_RANGES.some(p => ip.startsWith(p))) return { suspicious: false, reason: 'PRIVATE_IP', riskBonus: 0 }
  if (TOR_EXIT_NODES.has(ip)) return { suspicious: true, reason: 'TOR_EXIT_NODE', riskBonus: 40, label: 'Tor Exit Node' }
  for (const range of DATACENTER_RANGES) {
    if (isInCidr(ip, range)) return { suspicious: true, reason: 'DATACENTER_IP', riskBonus: 25, label: 'Datacenter/VPN IP' }
  }
  return { suspicious: false, reason: null, riskBonus: 0 }
}
export const isPrivateIP = (ip) => PRIVATE_RANGES.some(p => ip?.startsWith(p))
export { DATACENTER_RANGES }
