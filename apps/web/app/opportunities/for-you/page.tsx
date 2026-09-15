import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getSessionAccountFromToken,SESSION_COOKIE} from '@/lib/auth';
import {getEngine} from '@/lib/engine';
import {OpportunityShell} from '@/components/opportunity-shell';
import {RecommendationsWorkspace} from '@/components/missa/recommendations-workspace';

export const metadata = {
  title: 'Opportunities for you',
  description:
    'Opportunities matched to your practice, with the official source kept in view.',
  robots: { index: false, follow: false },
};

export default async function ForYouPage(){
  const session=await getSessionAccountFromToken((await cookies()).get(SESSION_COOKIE)?.value);if(!session)redirect('/login?next=/opportunities/for-you');
  const orgs=session.memberships.length?(await getEngine()).store.organizations:null;
  return <OpportunityShell session={{email:session.account.email,isAdmin:session.account.isAdmin,organizations:session.memberships.map(m=>({id:m.organizationId,name:orgs?.get(m.organizationId)?.name??"Organization"}))}}><main id="main-content" className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><RecommendationsWorkspace/></main></OpportunityShell>;
}
