import type { AnyNode, Element, Text } from 'domhandler';
import * as cheerio from 'cheerio';
import {
  ImageBlock,
  LayoutBlock,
  MarkdownTextObject,
  SectionBlock,
} from '../slack/types';

const EMOTICON_REGEX = /^:.*:$/;
const MAX_SLACK_BLOCKS = 50;
const MAX_SECTION_TEXT_LENGTH = 3000;

export interface PostParsedData {
  author: string;
  avatarUrl?: string;
  postUrl?: string;
  bodyNodes: AnyNode[];
}

/**
 * Checks if a node is a Cheerio/domhandler Element
 */
export function isElement(node: AnyNode): node is Element {
  return node.type === 'tag';
}

/**
 * Checks if a node is a Cheerio/domhandler Text node
 */
export function isText(node: AnyNode): node is Text {
  return node.type === 'text';
}

/**
 * Converts parsed Something Awful post nodes into Slack Block Kit layout blocks
 */
export function processElementsIntoSections(data: {
  author: string;
  avatarUrl?: string;
  bodyNodes: AnyNode[];
}): LayoutBlock[] {
  const outputBlocks: LayoutBlock[] = [];

  // 1. Author Block
  const authorText = `*${data.author} posted:*`;
  const authorBlock: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: authorText,
    },
  };

  if (data.avatarUrl && data.avatarUrl.startsWith('http')) {
    authorBlock.accessory = {
      type: 'image',
      image_url: data.avatarUrl,
      alt_text: `${data.author}'s avatar`,
    };
  }

  outputBlocks.push(authorBlock);

  let currentTextBuffer = '';

  const flushTextBuffer = () => {
    const trimmed = currentTextBuffer.trim();
    if (trimmed.length > 0) {
      // Slack limits section text to 3000 characters
      const chunks = splitTextIntoChunks(trimmed, MAX_SECTION_TEXT_LENGTH);
      for (const chunk of chunks) {
        if (outputBlocks.length < MAX_SLACK_BLOCKS) {
          outputBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: chunk,
            },
          });
        }
      }
    }
    currentTextBuffer = '';
  };

  const addImageBlock = (imageUrl: string, altText = 'Image from somethingawful post') => {
    flushTextBuffer();
    if (outputBlocks.length < MAX_SLACK_BLOCKS) {
      outputBlocks.push({
        type: 'image',
        image_url: imageUrl,
        alt_text: altText,
      });
    }
  };

  for (const node of data.bodyNodes) {
    if (outputBlocks.length >= MAX_SLACK_BLOCKS) {
      break;
    }
    processNode(node, {
      appendInlineText: (text) => {
        currentTextBuffer += text;
      },
      flushSection: flushTextBuffer,
      addImage: addImageBlock,
    });
  }

  flushTextBuffer();

  return outputBlocks;
}

interface ProcessContext {
  appendInlineText: (text: string) => void;
  flushSection: () => void;
  addImage: (url: string, alt?: string) => void;
}

function processNode(node: AnyNode, ctx: ProcessContext): void {
  // Plain text
  if (isText(node)) {
    ctx.appendInlineText(node.data);
    return;
  }

  if (!isElement(node)) {
    return;
  }

  const tagName = node.name.toLowerCase();

  // Links: <a href="...">text</a> -> <href|text>
  if (tagName === 'a') {
    const href = node.attribs['href'] || '';
    const linkText = extractCleanText(node) || href;
    ctx.appendInlineText(`<${href}|${linkText}>`);
    return;
  }

  // Images & Emoticons
  if (tagName === 'img') {
    const src = node.attribs['src'] || '';
    const title = node.attribs['title'] || '';

    // If source is from somethingawful and title is an emoticon (:name:)
    if (src.includes('somethingawful.com') && EMOTICON_REGEX.test(title)) {
      ctx.appendInlineText(title);
    } else if (src) {
      ctx.addImage(src, node.attribs['alt'] || 'Image from somethingawful post');
    }
    return;
  }

  // Line breaks
  if (tagName === 'br') {
    ctx.flushSection();
    return;
  }

  // Quote blocks: <div class="bbc-block"> or <blockquote>
  if (tagName === 'blockquote' || (tagName === 'div' && node.attribs['class']?.includes('bbc-block'))) {
    ctx.flushSection();
    let quoteAuthor = '';
    let quoteText = '';

    const findQuoteParts = (el: Element) => {
      for (const child of el.children || []) {
        if (isElement(child)) {
          if (child.name.toLowerCase() === 'h4') {
            quoteAuthor = extractTextDirect(child).trim();
          } else if (child.name.toLowerCase() === 'blockquote') {
            quoteText = extractTextDirect(child).trim();
          } else {
            findQuoteParts(child);
          }
        }
      }
    };

    if (tagName === 'blockquote') {
      quoteText = extractTextDirect(node).trim();
    } else {
      findQuoteParts(node);
    }

    if (!quoteText) {
      quoteText = extractTextDirect(node).trim();
    }

    const formattedQuote = quoteAuthor
      ? `> *${quoteAuthor}*\n> ${quoteText.split('\n').join('\n> ')}`
      : `> ${quoteText.split('\n').join('\n> ')}`;

    ctx.appendInlineText(formattedQuote);
    ctx.flushSection();
    return;
  }

  // Spoilers: <span class="bbc-spoiler">
  if (node.attribs['class']?.includes('bbc-spoiler')) {
    const spoilerContent = extractCleanText(node);
    ctx.appendInlineText(`[spoiler]${spoilerContent}[/spoiler]`);
    return;
  }

  // Bold
  if (tagName === 'b' || tagName === 'strong') {
    ctx.appendInlineText(`*${extractCleanText(node)}*`);
    return;
  }

  // Italics
  if (tagName === 'i' || tagName === 'em') {
    ctx.appendInlineText(`_${extractCleanText(node)}_`);
    return;
  }

  // Strikethrough
  if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
    ctx.appendInlineText(`~${extractCleanText(node)}~`);
    return;
  }

  // Code
  if (tagName === 'code' || tagName === 'tt') {
    ctx.appendInlineText(`\`${extractCleanText(node)}\``);
    return;
  }

  // Preformatted block
  if (tagName === 'pre') {
    ctx.flushSection();
    ctx.appendInlineText(`\`\`\`\n${extractCleanText(node)}\n\`\`\``);
    ctx.flushSection();
    return;
  }

  // Default: recurse into children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      processNode(child, ctx);
    }
  }
}

function extractTextDirect(node: AnyNode): string {
  if (isText(node)) {
    return node.data;
  }
  if (isElement(node) && node.children) {
    return node.children.map(extractTextDirect).join('');
  }
  return '';
}

function extractCleanText(element: Element): string {
  return extractTextDirect(element).trim();
}

function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) {
    return [text];
  }
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx === -1 || splitIdx < maxLen / 2) {
      splitIdx = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitIdx === -1) {
      splitIdx = maxLen;
    }
    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }
  return chunks;
}
