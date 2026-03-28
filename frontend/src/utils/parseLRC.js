export default function parseLRC(lrc) {
  if (!lrc) return null
  const lines = []
  const regex = /\[(\d+):(\d+\.\d+)\](.*)/g
  let m
  while ((m = regex.exec(lrc)) !== null) {
    lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() })
  }
  return lines.length > 0 ? lines : null
}
