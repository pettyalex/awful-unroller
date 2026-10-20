import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { processElementsIntoSections } from '../src/unroller/blocks';
import { SectionBlock, ImageBlock } from '../src/slack/types';

describe('processElementsIntoSections', () => {
  it('correctly processes text, links, emoticons, and images', () => {
    const html = `
      Hello world!
      <a href="https://example.com">Click Here</a>
      <img src="https://fi.somethingawful.com/customtitles/title.gif" title=":smile:">
      <br>
      <img src="https://i.imgur.com/photo.png" alt="An external photo">
      <br>
      After the image!
    `;

    const $ = cheerio.load(`<div id="body">${html}</div>`);
    const bodyNodes = ($('#body')[0] as any).childNodes;

    const blocks = processElementsIntoSections({
      author: 'TestUser',
      avatarUrl: 'https://fi.somethingawful.com/avatar.png',
      bodyNodes,
    });

    expect(blocks.length).toBeGreaterThanOrEqual(3);

    // 1. Author block
    const authorBlock = blocks[0] as SectionBlock;
    expect(authorBlock.type).toBe('section');
    expect(authorBlock.text?.text).toBe('*TestUser posted:*');
    expect(authorBlock.accessory?.image_url).toBe('https://fi.somethingawful.com/avatar.png');

    // 2. Text block containing link and emoticon
    const textBlock = blocks[1] as SectionBlock;
    expect(textBlock.type).toBe('section');
    expect(textBlock.text?.text).toContain('Hello world!');
    expect(textBlock.text?.text).toContain('<https://example.com|Click Here>');
    expect(textBlock.text?.text).toContain(':smile:');

    // 3. Image block
    const imageBlock = blocks[2] as ImageBlock;
    expect(imageBlock.type).toBe('image');
    expect(imageBlock.image_url).toBe('https://i.imgur.com/photo.png');

    // 4. Following text block
    const afterBlock = blocks[3] as SectionBlock;
    expect(afterBlock.type).toBe('section');
    expect(afterBlock.text?.text).toBe('After the image!');
  });

  it('formats Something Awful quotes with author', () => {
    const html = `
      <div class="bbc-block">
        <h4>SabGuy posted:</h4>
        <blockquote>It would be kind of funny if there were bike computer fanboys.</blockquote>
      </div>
      Totally agree!
    `;

    const $ = cheerio.load(`<div id="body">${html}</div>`);
    const bodyNodes = ($('#body')[0] as any).childNodes;

    const blocks = processElementsIntoSections({
      author: 'Lewis',
      bodyNodes,
    });

    expect(blocks.length).toBe(3);
    const quoteBlock = blocks[1] as SectionBlock;
    expect(quoteBlock.text?.text).toContain('> *SabGuy posted:*');
    expect(quoteBlock.text?.text).toContain('bike computer fanboys');

    const replyBlock = blocks[2] as SectionBlock;
    expect(replyBlock.text?.text).toBe('Totally agree!');
  });
});
