async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  const nodeCrypto = await import('node:crypto');
  return (nodeCrypto.webcrypto as unknown as { subtle: SubtleCrypto }).subtle;
}

/**
 * Verifies Slack request signature using the Web Crypto API
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export async function verifySlackSignature(options: {
  signingSecret: string;
  requestBody: string;
  timestamp: string | null;
  signature: string | null;
}): Promise<boolean> {
  const { signingSecret, requestBody, timestamp, signature } = options;

  if (!timestamp || !signature || !signingSecret) {
    return false;
  }

  // Prevent replay attacks: ensure timestamp is within 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > 60 * 5) {
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${requestBody}`;
  const encoder = new TextEncoder();
  const subtle = await getSubtleCrypto();

  const key = await subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await subtle.sign(
    'HMAC',
    key,
    encoder.encode(sigBaseString)
  );

  const hashHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expectedSignature = `v0=${hashHex}`;

  return timingSafeEqual(signature, expectedSignature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
