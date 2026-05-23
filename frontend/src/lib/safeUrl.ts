// src/lib/safeUrl.ts
//
// Normalise user-supplied URLs before rendering them in `href`/`src`.
// Authors of articles can paste arbitrary text into the "Links" field;
// without this filter, `javascript:alert(...)` and `data:text/html,...`
// would be executed when a reader clicks the link.

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/** Returns the URL as-is if it uses a safe protocol, otherwise returns `null`. */
export function safeUrl(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Protocol-relative URLs ("//example.com") are fine — the browser will pick http/https.
  if (trimmed.startsWith('//')) return trimmed
  // Bare paths and fragments are fine.
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  try {
    const u = new URL(trimmed)
    return SAFE_PROTOCOLS.has(u.protocol) ? trimmed : null
  } catch {
    // Not a parseable absolute URL — assume it's a bare host like "example.com"
    // and force https:// so we never accidentally fall back to file:// or anything weird.
    return `https://${trimmed}`
  }
}
