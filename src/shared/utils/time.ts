// Compact relative time formatter: "just now", "5m ago", "3h ago", "2d ago", etc.
// Designed to stay short so it fits in tight UI spaces.

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

/** Full timestamp for use in title="..." tooltips. */
export function fullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
