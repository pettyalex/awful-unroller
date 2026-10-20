import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { verifySlackSignature } from '../src/slack/verify';

const subtle = (typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : (webcrypto as unknown as { subtle: SubtleCrypto }).subtle);

describe('verifySlackSignature', () => {
  const secret = 'test-signing-secret';

  it('validates a properly signed Slack payload', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ type: 'url_verification', challenge: 'xyz123' });

    // Generate expected signature
    const sigBase = `v0:${timestamp}:${body}`;
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await subtle.sign('HMAC', key, encoder.encode(sigBase));
    const hex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const signature = `v0=${hex}`;

    const isValid = await verifySlackSignature({
      signingSecret: secret,
      requestBody: body,
      timestamp,
      signature,
    });

    expect(isValid).toBe(true);
  });

  it('rejects an invalid signature', async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = 'sample-body';
    const isValid = await verifySlackSignature({
      signingSecret: secret,
      requestBody: body,
      timestamp,
      signature: 'v0=invalidhash1234567890abcdef',
    });
    expect(isValid).toBe(false);
  });

  it('rejects an expired timestamp (>5 minutes old)', async () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
    const body = 'sample-body';
    const isValid = await verifySlackSignature({
      signingSecret: secret,
      requestBody: body,
      timestamp: oldTimestamp,
      signature: 'v0=anyhash',
    });
    expect(isValid).toBe(false);
  });
});
