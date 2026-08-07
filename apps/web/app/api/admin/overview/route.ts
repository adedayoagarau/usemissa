import { platformAdminJson } from '@/lib/platformAdminApi';

export async function GET(request: Request) {
  return platformAdminJson(request);
}
