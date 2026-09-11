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
