import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('Worker HTTP Routing', () => {
  const dummyCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;

  it('handles /landing/success', async () => {
    const req = new Request('https://worker.local/landing/success');
    const res = await worker.fetch(req, {}, dummyCtx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OAuth Connection Worked');
  });

  it('handles /landing/failure', async () => {
    const req = new Request('https://worker.local/landing/failure');
    const res = await worker.fetch(req, {}, dummyCtx);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('OAuth Connection Failed');
  });

  it('handles health check at /', async () => {
    const req = new Request('https://worker.local/');
    const res = await worker.fetch(req, {}, dummyCtx);
    expect(res.status).toBe(200);
  });

  it('responds to Slack url_verification challenge', async () => {
    const challenge = 'test_challenge_abc_123';
    const body = JSON.stringify({
      type: 'url_verification',
      challenge,
    });

    const req = new Request('https://worker.local/slack/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const res = await worker.fetch(req, {}, dummyCtx);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { challenge: string };
    expect(data.challenge).toBe(challenge);
  });
});
