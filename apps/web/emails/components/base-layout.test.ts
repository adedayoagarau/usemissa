import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderBaseEmailLayout,
  renderRecordRow,
  htmlToPlainText,
  highlight,
  dataValue,
  EMAIL_COLORS,
} from './base-layout';

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

test('the expressive register sets the title in Newsreader, the operational one in Instrument Sans', () => {
  const base = { subject: 'Subject', title: 'A decision arrived.', bodyHtml: '<p>Body</p>' };

  const expressive = renderBaseEmailLayout({ ...base, register: 'expressive' });
  const operational = renderBaseEmailLayout({ ...base, register: 'operational' });

  assert.match(expressive, /<h1[^>]*Newsreader/);
  assert.match(operational, /<h1[^>]*Instrument Sans/);

  // Operational is the default, so an unspecified register never shouts.
  assert.match(renderBaseEmailLayout(base), /<h1[^>]*Instrument Sans/);
});

test('titleHighlight marks a phrase in citron and leaves an absent phrase alone', () => {
  const marked = renderBaseEmailLayout({
    subject: 'Subject',
    title: '3 calls are closing.',
    titleHighlight: '3 calls',
    bodyHtml: '<p>Body</p>',
  });
  assert.ok(marked.includes(EMAIL_COLORS.citron));
  assert.match(marked, /m-mark[^>]*>3 calls</);

  const unmarked = renderBaseEmailLayout({
    subject: 'Subject',
    title: '3 calls are closing.',
    titleHighlight: 'not in the title',
    bodyHtml: '<p>Body</p>',
  });
  // `.m-mark` is also a dark-mode rule in the stylesheet, so check the title itself.
  const title = unmarked.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
  assert.ok(title.includes('3 calls are closing.'));
  assert.ok(!title.includes('m-mark'));
});

test('titleHighlight escapes before matching so markup cannot be injected', () => {
  const html = renderBaseEmailLayout({
    subject: 'Subject',
    title: 'Accepted by <b>Granta</b>.',
    titleHighlight: '<b>Granta</b>',
    bodyHtml: '<p>Body</p>',
  });

  assert.ok(html.includes('&lt;b&gt;Granta&lt;/b&gt;'));
  assert.ok(!html.includes('<b>Granta</b>'));
});

test('the primary button ships a VML fallback so Outlook does not render a bare link', () => {
  const html = renderBaseEmailLayout({
    subject: 'Subject',
    title: 'Title',
    bodyHtml: '<p>Body</p>',
    callToAction: { label: 'Open Tracker', url: 'https://usemissa.com/tracker' },
  });

  assert.ok(html.includes('v:roundrect'));
  assert.ok(html.includes('<!--[if mso]>'));
  assert.ok(html.includes('arcsize="18%"')); // the 8px radius DESIGN.md specifies
});

test('the layout declares dark-mode support', () => {
  const html = renderBaseEmailLayout({ subject: 'Subject', title: 'Title', bodyHtml: '<p>Body</p>' });

  assert.ok(html.includes('name="color-scheme"'));
  assert.ok(html.includes('prefers-color-scheme: dark'));
});

test('renderRecordRow builds a table rather than a flex row, and escapes its values', () => {
  const row = renderRecordRow({
    kicker: 'Granta & Co',
    title: 'Open Fiction <Submissions>',
    flag: '3 days left',
    flagUrgent: true,
    meta: 'Fri, 26 Sep 2026',
  });

  assert.ok(!row.includes('display:flex'));
  assert.ok(row.includes('<table'));
  assert.ok(row.includes('Granta &amp; Co'));
  assert.ok(row.includes('Open Fiction &lt;Submissions&gt;'));
  assert.ok(row.includes(EMAIL_COLORS.citron)); // urgent flags take the accent
});

test('highlight and dataValue produce the tokens they promise', () => {
  assert.ok(highlight('3 days').includes(EMAIL_COLORS.citron));
  assert.ok(dataValue('26 Sep 2026').includes('Fragment Mono'));
  assert.ok(dataValue('<script>').includes('&lt;script&gt;'));
});
