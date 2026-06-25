/**
 * Copy text to clipboard with a fallback for older browsers.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

/**
 * Format a satoshi balance for display.
 * Accepts number, bigint, or string.
 */
export function formatSats(value) {
  if (value === null || value === undefined) return '0'
  const n = typeof value === 'bigint' ? value : BigInt(Math.round(Number(value)))
  return n.toLocaleString()
}
