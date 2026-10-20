import { describe, it, expect } from 'vitest';
import { extractPostId } from '../src/scraper/awful';

describe('extractPostId', () => {
  it('extracts post ID from hash with post prefix', () => {
    const url = 'https://forums.somethingawful.com/showthread.php?threadid=3953960&pagenumber=1527#post514840766';
    expect(extractPostId(url)).toBe('post514840766');
  });

  it('extracts post ID from hash without prefix', () => {
    const url = 'https://forums.somethingawful.com/showthread.php?threadid=3953960#514840766';
    expect(extractPostId(url)).toBe('514840766');
  });

  it('extracts post ID from postid query param', () => {
    const url = 'https://forums.somethingawful.com/showthread.php?goto=post&postid=514821223';
    expect(extractPostId(url)).toBe('post514821223');
  });

  it('extracts post ID from p query param', () => {
    const url = 'https://forums.somethingawful.com/showthread.php?p=514821223';
    expect(extractPostId(url)).toBe('post514821223');
  });

  it('returns null for URLs without post ID', () => {
    const url = 'https://forums.somethingawful.com/forumdisplay.php?forumid=1';
    expect(extractPostId(url)).toBeNull();
  });
});
