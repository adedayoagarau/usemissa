import type { GuidelineImportReport } from './domain/types.js';

export interface GuidelineImportResult {
  text: string;
  report: GuidelineImportReport;
}

function assertSafeUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Guideline URL is invalid'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Guideline URL must use http or https');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('169.254.')) throw new Error('Guideline URL points to a private network');
  return url;
}

function stripHtml(input: string): string {
  return input.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim().slice(0, 100_000);
}

function extractPdfText(bytes: Uint8Array): string {
  // Keep extraction dependency-free in serverless functions. This captures
  // common uncompressed PDF text operators; the report explicitly marks it
  // low-confidence so an admin can verify the source document.
  const raw = new TextDecoder('latin1').decode(bytes);
  const fragments = [...raw.matchAll(/\(([^()]*)\)\s*T[Jj]/g)].map((match) => match[1].replace(/\\([\\()])/g, '$1'));
  return fragments.join(' ').replace(/\s+/g, ' ').trim().slice(0, 100_000);
}

export async function importGuidelines(sourceUrl: string): Promise<GuidelineImportResult> {
  const url = assertSafeUrl(sourceUrl);
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000), headers: { accept: 'text/html,application/pdf;q=0.9,*/*;q=0.1' } });
  if (!response.ok) throw new Error(`Guideline source returned ${response.status}`);
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > 5_000_000) throw new Error('Guideline source exceeds the 5 MB import limit');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 5_000_000) throw new Error('Guideline source exceeds the 5 MB import limit');
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const sourceType = contentType.includes('pdf') || url.pathname.toLowerCase().endsWith('.pdf') ? 'pdf' : 'html';
  const text = sourceType === 'pdf' ? extractPdfText(bytes) : stripHtml(new TextDecoder().decode(bytes));
  const warnings = sourceType === 'pdf' ? ['PDF text extraction is best-effort; verify the source before publishing requirements.'] : [];
  if (!text) warnings.push('No readable guideline text was extracted; use the source link for review.');
  return { text, report: { sourceUrl: url.toString(), sourceType, byteLength: bytes.byteLength, extractedCharacters: text.length, confidence: sourceType === 'pdf' ? 'low' : 'high', warnings } };
}
