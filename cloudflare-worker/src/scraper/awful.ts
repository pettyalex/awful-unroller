import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { PostParsedData } from '../unroller/blocks';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AwfulUnroller/1.0';

export interface ScraperOptions {
  cookies?: string;
  userAgent?: string;
}

/**
 * Parses a Something Awful forum URL and extracts the target post ID
 */
export function extractPostId(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);

    // 1. Check fragment (e.g. #post514827432 or #514827432)
    if (parsed.hash) {
      const hash = parsed.hash.replace(/^#/, '');
      if (hash) {
        return hash;
      }
    }

    // 2. Check postid query param
    const postidParam = parsed.searchParams.get('postid');
    if (postidParam) {
      return postidParam.startsWith('post') ? postidParam : `post${postidParam}`;
    }

    // 3. Check p parameter (sometimes used in thread redirect URLs)
    const pParam = parsed.searchParams.get('p');
    if (pParam) {
      return pParam.startsWith('post') ? pParam : `post${pParam}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches and parses a Something Awful thread page into a Cheerio document
 */
export async function fetchAwfulPage(url: string, options?: ScraperOptions): Promise<cheerio.CheerioAPI> {
  const headers: Record<string, string> = {
    'User-Agent': options?.userAgent || DEFAULT_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  if (options?.cookies) {
    headers['Cookie'] = options.cookies;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Something Awful page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return cheerio.load(html);
}

/**
 * Extracts the author, avatar, and post body elements from a Something Awful page
 */
export async function getPostElementsForSlack(
  url: string,
  options?: ScraperOptions
): Promise<PostParsedData> {
  const correctedUrl = url.replace(/&amp;/g, '&');
  const targetPostId = extractPostId(correctedUrl);

  const $ = await fetchAwfulPage(correctedUrl, options);

  let $post: cheerio.Cheerio<any> | null = null;

  // Try finding the post by target ID (with or without 'post' prefix)
  if (targetPostId) {
    const rawId = targetPostId.replace(/^post/, '');
    const candidateIds = [targetPostId, `post${rawId}`, rawId];
    for (const id of candidateIds) {
      const el = $(`#${id}`);
      if (el.length > 0) {
        $post = el;
        break;
      }
    }
  }

  // Fallback: If no target ID or not found, select first post on page
  if (!$post || $post.length === 0) {
    const candidate = $('table.post, div.post').first();
    if (candidate.length > 0) {
      $post = candidate;
    }
  }

  if (!$post || $post.length === 0) {
    throw new Error(`Could not find post content for URL: ${url}`);
  }

  // Author extraction (dt.author in standard SA layout)
  let author = $post.find('dt.author').text().trim();
  if (!author) {
    author = $post.find('.author').first().text().trim();
  }
  if (!author) {
    author = 'Something Awful User';
  }

  // Avatar extraction (dd.title img or .title img)
  let avatarUrl: string | undefined;
  const $avatarImg = $post.find('dd.title img, .title img').first();
  if ($avatarImg.length > 0) {
    const src = $avatarImg.attr('src');
    if (src && src.startsWith('http')) {
      avatarUrl = src;
    }
  }

  // Post body extraction (td.postbody)
  const $postBody = $post.find('td.postbody').first();
  if ($postBody.length === 0) {
    throw new Error(`Post found but no td.postbody element in: ${url}`);
  }

  const bodyNodes: AnyNode[] = ($postBody[0] as any).childNodes || [];

  return {
    author,
    avatarUrl,
    postUrl: correctedUrl,
    bodyNodes,
  };
}
