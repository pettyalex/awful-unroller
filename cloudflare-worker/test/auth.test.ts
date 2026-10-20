import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSomethingAwfulCookies,
  invalidateCookieCache,
  performSomethingAwfulLogin,
} from '../src/scraper/auth';

describe('Something Awful Auth', () => {
  beforeEach(() => {
    invalidateCookieCache();
    vi.restoreAllMocks();
  });

  it('returns explicit cookies when provided', async () => {
    const cookies = 'bbuserid=12345; bbpassword=abcdef';
    const result = await getSomethingAwfulCookies({ cookies });
    expect(result).toBe(cookies);
  });

  it('returns undefined when neither cookies nor credentials are provided', async () => {
    const result = await getSomethingAwfulCookies({});
    expect(result).toBeUndefined();
  });

  it('authenticates and extracts Set-Cookie headers from account.php', async () => {
    const mockHeaders = new Headers();
    mockHeaders.append('set-cookie', 'bbuserid=99999; path=/; domain=.somethingawful.com');
    mockHeaders.append('set-cookie', 'bbpassword=secret_hash_value; path=/; domain=.somethingawful.com');
    mockHeaders.append('set-cookie', 'sessionhash=sess_123; path=/');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: mockHeaders,
      })
    );

    const cookies = await performSomethingAwfulLogin('TestUser', 'TestPass');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://forums.somethingawful.com/account.php',
      expect.objectContaining({
        method: 'POST',
      })
    );

    expect(cookies).toContain('bbuserid=99999');
    expect(cookies).toContain('bbpassword=secret_hash_value');
    expect(cookies).toContain('sessionhash=sess_123');
  });

  it('caches the login session across calls', async () => {
    const mockHeaders = new Headers();
    mockHeaders.append('set-cookie', 'bbuserid=88888; path=/');
    mockHeaders.append('set-cookie', 'bbpassword=pass_hash; path=/');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: mockHeaders,
      })
    );

    const first = await getSomethingAwfulCookies({ username: 'User1', password: 'Pwd' });
    const second = await getSomethingAwfulCookies({ username: 'User1', password: 'Pwd' });

    expect(first).toBe('bbuserid=88888; bbpassword=pass_hash');
    expect(second).toBe(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only logged in once!
  });
});
