import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBaseEmailLayout, htmlToPlainText } from './base-layout';

test('renderBaseEmailLayout produces valid HTML with Forest tokens and escaped values', () => {
  const html = renderBaseEmailLayout({
    subject: 'Welcome to <Missa>',
    title: 'Your creative calls, tracked.',
    bodyHtml: '<p>You have saved your first call.</p>',
    callToAction: {
      label: 'Explore Opportunities',
      url: 'https://usemissa.com/opportunities',
    },
    unsubscribeUrl: 'https://usemissa.com/unsubscribe?token=xyz',
  });

  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('#285649')); // Forest-600
  assert.ok(html.includes('Welcome to &lt;Missa&gt;')); // Escaped title/subject
  assert.ok(html.includes('Your creative calls, tracked.'));
  assert.ok(html.includes('https://usemissa.com/opportunities'));
  assert.ok(html.includes('https://usemissa.com/unsubscribe?token=xyz'));
});

test('the call to action carries padding Outlook can see', () => {
  const html = renderBaseEmailLayout({
    subject: 'Subject',
    title: 'Title',
    bodyHtml: '<p>Body</p>',
    callToAction: { label: 'Open your Tracker', url: 'https://usemissa.com/tracker' },
  });

  // Outlook's Word engine drops padding from the inline-block anchor, so the
  // button cell states it again in a property only Outlook reads. Without this
  // the fill shrink-wraps the label and the button looks cramped.
  assert.match(html, /<td[^>]*mso-padding-alt:13px 22px;[^>]*>\s*<a/);
});

test('htmlToPlainText extracts clean readable plain text from HTML', () => {
  const html = `
    <h1>Hello World</h1>
    <p>This is a test with a <a href="https://usemissa.com">link</a>.</p>
    <div>Another line</div>
  `;
  const text = htmlToPlainText(html);
  assert.ok(text.includes('Hello World'));
  assert.ok(text.includes('link (https://usemissa.com)'));
  assert.ok(!text.includes('<h1>'));
  assert.ok(!text.includes('<p>'));
});
