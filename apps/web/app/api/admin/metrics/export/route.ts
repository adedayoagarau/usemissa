import { NextResponse } from 'next/server';
import { platformAdminAuthResponse, requirePlatformAdmin } from '@/lib/platformAdmin';
import { getShareableMetrics, monthlyMetricsCsv } from '@/lib/shareableMetrics';

/** Month-by-month metrics as CSV, ready for an investor update or a spreadsheet model. */
export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  const denied = platformAdminAuthResponse(auth);
  if (!auth.ok) return denied!;
  const { monthly, mrrByMonth } = await getShareableMetrics();
  return new NextResponse(monthlyMetricsCsv(monthly, mrrByMonth), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="missa-monthly-metrics-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}
