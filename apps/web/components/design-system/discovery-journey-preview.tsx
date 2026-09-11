"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth-form";

import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./discovery-journey-preview.module.css";

const root = '/design-system/discovery-journey/';
const sequence = ['home', 'opportunities', 'rankings', 'directory', 'signup', 'personalization'];
const labels: Record<string,string> = { home:'Home', opportunities:'Opportunities', rankings:'Rankings', directory:'Directory', signup:'Signup', personalization:'Personalization', compare:'Compare magazines', methodology:'How Missa ranks' };
const destinations: Record<string,string> = { '/':'home', '/opportunities':'opportunities', '/rankings/magazines':'rankings', '/rankings/compare':'compare', '/rankings/methodology':'methodology', '/directory':'directory', '/signup':'signup', '/onboarding':'personalization', '/workspace':'opportunities', '/design-system/creator-profile-settings':'directory' };

export function JourneyPreview({ screen, children }: { screen:string; children:ReactNode }) {
  const router = useRouter();
  const index = sequence.indexOf(screen);
  return <div className={styles.preview}>
    <aside className={styles.review} aria-label="Preview controls">
      <div><strong>Connected preview</strong><span>Existing pages · proposed IA · signup simulation</span></div>
      <nav aria-label="Review sequence">{sequence.map(item => <Link key={item} href={root+item} aria-current={screen===item?'page':undefined} onClick={(event)=>{ event.preventDefault(); window.location.assign(root+item); }}>{labels[item]}</Link>)}</nav>
      <div className={styles.pager}>
        <Button variant="outline" disabled={index===0} onClick={()=>router.push(root+sequence[Math.max(0,index-1)])}><ArrowLeft aria-hidden="true" />Previous</Button>
        <Button onClick={()=>router.push(root+sequence[index<0?2:(index+1)%sequence.length])}>{index===sequence.length-1?'Back to home':'Next'}<ArrowRight aria-hidden="true" /></Button>
      </div>
    </aside>
    <div className={screen==='rankings'||screen==='compare'||screen==='methodology'?styles.rankings:undefined}>
      {screen !== "home" && <header className={styles.navigation}>
        <MissaWordmark href={root+'home'} />
        <nav aria-label="Proposed primary navigation">{['opportunities','rankings','directory'].map(item=><Link key={item} href={root+item} aria-current={screen===item?'page':undefined}>{labels[item]}</Link>)}</nav>
        <Button variant="outline" nativeButton={false} render={<Link href={root+'signup'} />}>Sign up</Button>
      </header>}
      <div className={`${styles.content} ${screen === "home" ? styles.homeContent : ""}`} onClickCapture={event=>{
        const anchor=(event.target as HTMLElement).closest('a');
        if(!anchor) return;
        const url=new URL(anchor.href,location.href);
        const next=destinations[url.pathname];
        if(url.origin===location.origin && next) { event.preventDefault(); event.stopPropagation(); window.location.assign(root+next+url.search+url.hash); }
      }}>{children}</div>
    </div>
  </div>;
}

export function SignupPreview() {
  const router=useRouter();
  return <div onSubmitCapture={event=>{
    event.preventDefault();
    event.stopPropagation();
    router.push(root+'personalization');
  }}>
    <p role="status" className="border-b border-border bg-muted px-6 py-3 text-sm">Design preview: the current signup screen. Use example details; submitting continues the tour without creating an account.</p>
    <AuthForm initialMode="signup" redirectTo={root+'personalization'} />
  </div>;
}
