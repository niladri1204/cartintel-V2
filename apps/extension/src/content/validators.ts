const INVALID_TITLE_TERMS = new Set([
  'subtotal',
  'cart',
  'shopping cart',
  'checkout',
  'sign in',
  'login',
  'search',
  'home',
  'menu',
]);

/**
 * Validates a product title string.
 * @param title The title string to validate
 * @returns boolean indicating whether the title is valid
 */
export function isValidTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  
  const trimmed = title.trim();
  if (trimmed.length < 3) return false; // Too short to be a real product title

  const lower = trimmed.toLowerCase();
  if (INVALID_TITLE_TERMS.has(lower)) return false;

  return true;
}

/**
 * Validates an image URL string.
 * @param url The image URL string to validate
 * @returns boolean indicating whether the URL is valid
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  // Ignore 1x1 transparent spacer/placeholder data URLs
  if (trimmed.startsWith('data:image/gif;base64,R0lGOD') || trimmed.startsWith('data:image/svg+xml')) {
    return false;
  }

  // Reject website logos, studio banners, icons, and sprite graphics
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('studio-logo') ||
    lower.includes('myntra-logo') ||
    lower.includes('sprite') ||
    lower.includes('header-logo') ||
    lower.includes('brand-logo') ||
    lower.includes('favicon') ||
    lower.includes('logo-') ||
    lower.includes('-logo.') ||
    lower.includes('/logo')
  ) {
    return false;
  }
  
  return true;
}

/**
 * Normalizes an image URL to ensure it has a complete scheme (http/https)
 * so browser extension popups can render it properly.
 * @param url Raw image URL string
 * @param hostname Optional hostname fallback for root-relative paths
 * @returns Complete absolute image URL string or null
 */
export function normalizeImageUrl(url: string | null | undefined, hostname?: string): string | null {
  if (!url || !isValidImageUrl(url)) return null;

  let trimmed = url.trim();

  // If protocol-relative (e.g. "//media.tatacroma.com/...")
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // If root-relative (e.g. "/images/p.jpg")
  if (trimmed.startsWith('/')) {
    let origin = '';
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
      origin = window.location.origin;
    } else if (hostname) {
      origin = hostname.startsWith('http') ? hostname : `https://${hostname}`;
    }
    return origin ? `${origin}${trimmed}` : trimmed;
  }

  return trimmed;
}
