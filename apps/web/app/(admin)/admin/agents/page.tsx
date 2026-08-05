import PlatformAdminAgentControls from '@/components/platform-admin-agent-controls';
import { AdminPageFrame } from '@/components/platform-admin';
import { getPlatformAdminAgentControls } from '@/lib/platformAdminFoundations';

export default async function PlatformAdminAgentsPage() {
  return <AdminPageFrame><PlatformAdminAgentControls area={await getPlatformAdminAgentControls()} /></AdminPageFrame>;
}
