// Time formatting utilities

/**
 * Format a timestamp as relative time
 * Examples: "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return 'just now'
  }

  // Less than 1 hour - show minutes
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }

  // Less than 24 hours - show hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }

  // Less than 2 days - show "yesterday"
  if (diff < 2 * 24 * 60 * 60 * 1000) {
    return 'yesterday'
  }

  // Less than 7 days - show days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days} days ago`
  }

  // More than 7 days - show date
  const date = new Date(timestamp)
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'short' })
  const year = date.getFullYear()
  const currentYear = new Date().getFullYear()

  // Same year - don't show year
  if (year === currentYear) {
    return `${day} ${month}`
  }

  return `${day} ${month} ${year}`
}

/**
 * Format timestamp as absolute date and time
 * Example: "Oct 11, 2025 at 14:30"
 */
export function formatAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp)
  const day = date.getDate()
  const month = date.toLocaleString('default', { month: 'short' })
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${month} ${day}, ${year} at ${hours}:${minutes}`
}

