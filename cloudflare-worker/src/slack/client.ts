import { LayoutBlock, UnfurlsMap } from './types';

export interface ChatUnfurlOptions {
  botToken: string;
  channel: string;
  ts: string;
  unfurls: UnfurlsMap;
}

export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  warning?: string;
  [key: string]: unknown;
}

/**
 * Sends unfurled content back to Slack via chat.unfurl API
 * https://api.slack.com/methods/chat.unfurl
 */
export async function sendChatUnfurl(options: ChatUnfurlOptions): Promise<SlackApiResponse> {
  const { botToken, channel, ts, unfurls } = options;

  const response = await fetch('https://slack.com/api/chat.unfurl', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel,
      ts,
      unfurls,
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack API HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as SlackApiResponse;
  if (!data.ok) {
    console.error('Slack chat.unfurl API error:', data.error, data);
  }
  return data;
}
