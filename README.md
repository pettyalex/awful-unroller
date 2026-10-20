# Something Awful Slack Unroller

This repository contains two implementations of the Something Awful Slack post unroller service:

1. **[`cloudflare-worker/`](cloudflare-worker/):** The modern, serverless implementation built in **TypeScript** for **Cloudflare Workers**. It features low-latency execution, full BBCode/quote/emoticon/image block formatting, native Web Crypto verification, and immediate 200 OK acknowledgment with background unfurling via `ctx.waitUntil(...)`.
2. **[`kotlin-app/`](kotlin-app/):** The original, untouched Kotlin / Spring Boot 2 application using Slack Bolt and Jsoup.

---

## Cloudflare Worker (TypeScript)

Detailed instructions for setup, configuration, local testing, and deployment are in [`cloudflare-worker/README.md`](cloudflare-worker/README.md).

### Quickstart

```bash
cd cloudflare-worker

# Install dependencies
npm install

# Run unit tests
npm test

# Run type checker
npm run typecheck

# Deploy to Cloudflare
npm run deploy
```

---

## Original Kotlin Application (Spring Boot)

Detailed documentation is in [`kotlin-app/README.md`](kotlin-app/README.md).

### Build

```bash
cd kotlin-app
./gradlew bootJar
```
