# Something Awful Slack Unroller (Cloudflare Worker)

A Cloudflare Worker written in TypeScript that unfurls Something Awful forum posts when linked in Slack channels into rich Block Kit message previews.

## Features

- **Link Unfurling (`link_shared`):** Intercepts Something Awful forum post URLs (supports hash fragments like `#post514840766` and query params like `postid=...`).
- **Rich Post Formatting:**
  - Author attribution with user avatar (if available).
  - Quotes formatted with Slack blockquotes (`> *Author posted:*\n> quote text`).
  - Forum emoticons (`:smile:`, etc.) preserved inline.
  - Post images rendered as Slack `image` blocks.
  - Hyperlinks preserved as Slack mrkdwn links (`<url|text>`).
  - Formatted text (`*bold*`, `_italics_`, `~strikethrough~`, `code`).
- **Slack Timeout Resilient:** Uses Cloudflare Workers' `ctx.waitUntil(...)` to immediately respond `200 OK` to Slack within the strict 3-second timeout while fetching HTML and calling Slack's `chat.unfurl` in the background.
- **Request Verification:** Validates Slack's `X-Slack-Signature` and timestamp using native Web Crypto (`crypto.subtle` HMAC-SHA256).
- **OAuth Support:** Built-in endpoints for `/slack/install` and `/slack/oauth_redirect`.

---

## Configuration & Secrets

Set your Slack credentials using Wrangler secrets:

```bash
# Required for sending unfurls
npx wrangler secret put SLACK_BOT_TOKEN

# Required for verifying requests from Slack
npx wrangler secret put SLACK_SIGNING_SECRET

# Optional: For Slack App OAuth distribution
npx wrangler secret put SLACK_CLIENT_ID
npx wrangler secret put SLACK_CLIENT_SECRET

# Optional: Session cookies for paywalled/member-only SA forums (bbuserid, bbpassword, sessionhash)
npx wrangler secret put SA_COOKIES
```

---

## Development & Testing

```bash
# Install dependencies
npm install

# Run unit test suite
npm test

# Run type checker
npm run typecheck

# Start local worker development server
npm run dev
```

---

## Deployment

Deploy directly to your Cloudflare account with Wrangler:

```bash
npm run deploy
```

Configure your Slack App settings:
1. **Event Subscriptions:** Point **Request URL** to `https://<your-worker>.<subdomain>.workers.dev/slack/events`
2. **Subscribe to Workspace Events:** Add `link_shared`
3. **App Unfurl Domains:** Add `forums.somethingawful.com`
4. **OAuth & Permissions Bot Token Scopes:** Add `links:read` and `links:write`
