import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_REPORT_BYTES = 16 * 1024;

type CspReportBody = Record<string, unknown>;

function field(report: CspReportBody, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = report[name];
    if (typeof value === 'string' && value) return value.slice(0, 300);
  }
  return undefined;
}

/** Strips query strings so reports never log tokens carried in URLs. */
function withoutQuery(value: string | undefined): string | undefined {
  if (!value) return value;
  const cut = value.search(/[?#]/);
  return cut === -1 ? value : value.slice(0, cut);
}

/**
 * Receives Content-Security-Policy violation reports (report-uri format) and
 * logs a short summary so the report-only policy can be reviewed before it is
 * enforced. Nothing is stored and the response is always 204.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_REPORT_BYTES) return new NextResponse(null, { status: 204 });
  const text = await request.text().catch(() => '');
  if (!text || text.length > MAX_REPORT_BYTES) return new NextResponse(null, { status: 204 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const reports = Array.isArray(parsed) ? parsed : [parsed];
  for (const entry of reports.slice(0, 10)) {
    if (!entry || typeof entry !== 'object') continue;
    const outer = entry as CspReportBody;
    const report = (outer['csp-report'] ?? outer.body ?? outer) as CspReportBody;
    if (!report || typeof report !== 'object') continue;
    console.warn('CSP violation', {
      directive: field(report, 'effective-directive', 'effectiveDirective', 'violated-directive'),
      blocked: withoutQuery(field(report, 'blocked-uri', 'blockedURL')),
      page: withoutQuery(field(report, 'document-uri', 'documentURL')),
      source: withoutQuery(field(report, 'source-file', 'sourceFile')),
      disposition: field(report, 'disposition'),
    });
  }
  return new NextResponse(null, { status: 204 });
}
