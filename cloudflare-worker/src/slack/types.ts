export interface SlackLink {
  url: string;
  domain: string;
}

export interface SlackLinkSharedEvent {
  type: 'link_shared';
  user: string;
  channel: string;
  message_ts: string;
  links: SlackLink[];
  unfurl_id?: string;
  source?: string;
}

export interface SlackUrlVerificationPayload {
  type: 'url_verification';
  token?: string;
  challenge: string;
}

export interface SlackEventCallbackPayload {
  type: 'event_callback';
  token?: string;
  team_id: string;
  api_app_id: string;
  event: SlackLinkSharedEvent;
}

export type SlackPayload = SlackUrlVerificationPayload | SlackEventCallbackPayload;

export interface MarkdownTextObject {
  type: 'mrkdwn';
  text: string;
}

export interface PlainTextObject {
  type: 'plain_text';
  text: string;
  emoji?: boolean;
}

export interface ImageElement {
  type: 'image';
  image_url: string;
  alt_text: string;
}

export interface SectionBlock {
  type: 'section';
  text?: MarkdownTextObject | PlainTextObject;
  accessory?: ImageElement;
}

export interface ImageBlock {
  type: 'image';
  image_url: string;
  alt_text: string;
  title?: PlainTextObject;
}

export interface DividerBlock {
  type: 'divider';
}

export type LayoutBlock = SectionBlock | ImageBlock | DividerBlock;

export interface UnfurlDetail {
  blocks: LayoutBlock[];
}

export type UnfurlsMap = Record<string, UnfurlDetail>;
