import { sendChatUnfurl } from './slack/client';
import {
  LayoutBlock,
  SlackEventCallbackPayload,
  SlackLinkSharedEvent,
  SlackPayload,
  UnfurlsMap,
} from './slack/types';
import { verifySlackSignature } from './slack/verify';
import { getPostElementsForSlack } from './scraper/awful';
import { processElementsIntoSections } from './unroller/blocks';
import { getSomethingAwfulCookies, invalidateCookieCache } from './scraper/auth';

export interface Env {
  SLACK_BOT_TOKEN?: string;
  SLACK_SIGNING_SECRET?: string;
  SLACK_CLIENT_ID?: string;
  SLACK_CLIENT_SECRET?: string;
  SLACK_SCOPES?: string;
  SLACK_OAUTH_COMPLETION_URL?: string;
  SLACK_OAUTH_CANCELLATION_URL?: string;
  AWFUL_USERNAME?: string;
  AWFUL_PASSWORD?: string;
  AWFUL_COOKIES?: string;
  SA_COOKIES?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Landing pages (matching Kotlin OAuthLandingController)
    if (url.pathname === '/landing/success') {
      return new Response('OAuth Connection Worked', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (url.pathname === '/landing/failure') {
      return new Response('OAuth Connection Failed', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('awful-unroller worker is healthy\n', { status: 200 });
    }

    // Slack OAuth Installation
    if (url.pathname === '/slack/install') {
      if (!env.SLACK_CLIENT_ID) {
        return new Response('SLACK_CLIENT_ID not configured', { status: 500 });
      }
      const scopes = env.SLACK_SCOPES || 'links:read,links:write';
      const redirectUri = `${url.origin}/slack/oauth_redirect`;
      const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(
        env.SLACK_CLIENT_ID
      )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      return Response.redirect(slackOAuthUrl, 302);
    }

    // Slack OAuth Redirect
    if (url.pathname === '/slack/oauth_redirect') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        const failureUrl = env.SLACK_OAUTH_CANCELLATION_URL || `${url.origin}/landing/failure`;
        return Response.redirect(failureUrl, 302);
      }

      if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
        return new Response('Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET', { status: 500 });
      }

      try {
        const tokenResp = await fetch('https://slack.com/api/oauth.v2.access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.SLACK_CLIENT_ID,
            client_secret: env.SLACK_CLIENT_SECRET,
            code,
            redirect_uri: `${url.origin}/slack/oauth_redirect`,
          }),
        });

        const tokenData = (await tokenResp.json()) as { ok: boolean; error?: string };
        if (!tokenData.ok) {
          console.error('OAuth exchange failed:', tokenData.error);
          const failureUrl = env.SLACK_OAUTH_CANCELLATION_URL || `${url.origin}/landing/failure`;
          return Response.redirect(failureUrl, 302);
        }

        const successUrl = env.SLACK_OAUTH_COMPLETION_URL || `${url.origin}/landing/success`;
        return Response.redirect(successUrl, 302);
      } catch (err) {
        console.error('OAuth request exception:', err);
        const failureUrl = env.SLACK_OAUTH_CANCELLATION_URL || `${url.origin}/landing/failure`;
        return Response.redirect(failureUrl, 302);
      }
    }

    // Slack Events API webhook
    if (url.pathname === '/slack/events' && request.method === 'POST') {
      const rawBody = await request.text();

      // Signature Verification
      if (env.SLACK_SIGNING_SECRET) {
        const timestamp = request.headers.get('x-slack-request-timestamp');
        const signature = request.headers.get('x-slack-signature');
        const isValid = await verifySlackSignature({
          signingSecret: env.SLACK_SIGNING_SECRET,
          requestBody: rawBody,
          timestamp,
          signature,
        });

        if (!isValid) {
          console.warn('Invalid Slack request signature');
          return new Response('Invalid signature', { status: 401 });
        }
      }

      let payload: SlackPayload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return new Response('Invalid JSON payload', { status: 400 });
      }

      // Handle URL verification handshake
      if (payload.type === 'url_verification') {
        return new Response(JSON.stringify({ challenge: payload.challenge }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Handle link_shared event
      if (payload.type === 'event_callback') {
        const callbackPayload = payload as SlackEventCallbackPayload;
        if (callbackPayload.event?.type === 'link_shared') {
          // Process in background via ctx.waitUntil so we respond to Slack immediately within 3s
          ctx.waitUntil(handleLinkShared(callbackPayload.event, env));
          return new Response('ok', { status: 200 });
        }
      }

      return new Response('Ignored event', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Background worker to parse SA links and unfurl in Slack
 */
async function handleLinkShared(event: SlackLinkSharedEvent, env: Env): Promise<void> {
  if (!env.SLACK_BOT_TOKEN) {
    console.error('SLACK_BOT_TOKEN is not configured');
    return;
  }

  const unfurlsByUrl: UnfurlsMap = {};

  // Resolve Something Awful session cookies (via credentials login or direct cookie secret)
  let saCookies: string | undefined;
  try {
    saCookies = await getSomethingAwfulCookies({
      username: env.AWFUL_USERNAME,
      password: env.AWFUL_PASSWORD,
      cookies: env.AWFUL_COOKIES || env.SA_COOKIES,
    });
  } catch (authErr) {
    console.error('Failed to authenticate with Something Awful:', authErr);
  }

  for (const link of event.links) {
    try {
      const correctedUrl = link.url.replace(/&amp;/g, '&');
      const postData = await getPostElementsForSlack(correctedUrl, {
        cookies: saCookies,
      });

      const blocks = processElementsIntoSections({
        author: postData.author,
        avatarUrl: postData.avatarUrl,
        bodyNodes: postData.bodyNodes,
      });

      unfurlsByUrl[link.url] = { blocks };
    } catch (err) {
      console.error(`Failed to unroll post for URL: ${link.url}`, err);
      // Invalidate cookies if request failed (e.g. session expired)
      if (env.AWFUL_USERNAME && env.AWFUL_PASSWORD) {
        invalidateCookieCache();
      }
      // Fallback error block matching original Kotlin implementation
      const errorBlocks: LayoutBlock[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: "Error: I couldn't unfurl that, check the logs",
          },
        },
      ];
      unfurlsByUrl[link.url] = { blocks: errorBlocks };
    }
  }

  if (Object.keys(unfurlsByUrl).length > 0) {
    try {
      await sendChatUnfurl({
        botToken: env.SLACK_BOT_TOKEN,
        channel: event.channel,
        ts: event.message_ts,
        unfurls: unfurlsByUrl,
      });
      console.log(`Successfully unfurled ${Object.keys(unfurlsByUrl).length} link(s)`);
    } catch (err) {
      console.error('Failed to send chat.unfurl to Slack API:', err);
    }
  }
}
