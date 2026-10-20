const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AwfulUnroller/1.0';

export interface AuthOptions {
  username?: string;
  password?: string;
  cookies?: string;
  userAgent?: string;
}

// In-memory cookie cache per Worker isolate
let cachedCookieHeader: string | null = null;
let lastLoginTime = 0;
const COOKIE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Returns a valid Something Awful Cookie header string.
 * Uses explicit cookies if configured, or performs an automated login using username/password.
 */
export async function getSomethingAwfulCookies(options: AuthOptions): Promise<string | undefined> {
  // 1. Direct cookie override (e.g. from AWFUL_COOKIES or SA_COOKIES secret)
  if (options.cookies) {
    return options.cookies;
  }

  // 2. If no credentials provided, return undefined (public browsing)
  if (!options.username || !options.password) {
    return undefined;
  }

  // 3. Return cached session if still fresh
  const now = Date.now();
  if (cachedCookieHeader && now - lastLoginTime < COOKIE_TTL_MS) {
    return cachedCookieHeader;
  }

  // 4. Perform login to account.php
  const cookieHeader = await performSomethingAwfulLogin(
    options.username,
    options.password,
    options.userAgent || DEFAULT_USER_AGENT
  );

  if (cookieHeader) {
    cachedCookieHeader = cookieHeader;
    lastLoginTime = now;
    return cookieHeader;
  }

  return undefined;
}

/**
 * Logs in to Something Awful forums and extracts session cookies
 */
export async function performSomethingAwfulLogin(
  username: string,
  password: string,
  userAgent = DEFAULT_USER_AGENT
): Promise<string | null> {
  const loginUrl = 'https://forums.somethingawful.com/account.php';
  const formData = new URLSearchParams({
    action: 'login',
    username,
    password,
    next: '/',
  });

  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: formData.toString(),
    redirect: 'manual', // Intercept 302 to capture Set-Cookie headers
  });

  // Extract Set-Cookie headers
  const cookieHeaders = extractSetCookieHeaders(response);
  if (cookieHeaders.length === 0) {
    console.warn('Something Awful login request did not return any Set-Cookie headers');
    return null;
  }

  const cookiesMap = new Map<string, string>();
  for (const rawCookie of cookieHeaders) {
    const parts = rawCookie.split(';')[0].trim().split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookiesMap.set(name, value);
    }
  }

  // Format into standard Cookie header: "bbuserid=...; bbpassword=...; sessionhash=..."
  const cookiePairs: string[] = [];
  for (const [name, val] of cookiesMap.entries()) {
    cookiePairs.push(`${name}=${val}`);
  }

  const cookieHeader = cookiePairs.join('; ');
  return cookieHeader.length > 0 ? cookieHeader : null;
}

/**
 * Invalidate cached cookie (e.g. if forum returns logged-out page)
 */
export function invalidateCookieCache(): void {
  cachedCookieHeader = null;
  lastLoginTime = 0;
}

function extractSetCookieHeaders(response: Response): string[] {
  // Use getSetCookie() if supported in modern Fetch / Workers
  if (typeof (response.headers as any).getSetCookie === 'function') {
    return (response.headers as any).getSetCookie();
  }

  // Fallback to get('set-cookie')
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}
