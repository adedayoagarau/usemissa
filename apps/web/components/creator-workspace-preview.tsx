"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, FolderOpen, LayoutDashboard, Library } from "lucide-react";
import Link from "next/link";
import styles from "./creator-workspace-preview.module.css";

type View = "now" | "applications" | "materials" | "calendar";
const nav = [
  { id: "now", label: "Now", icon: LayoutDashboard },
  { id: "applications", label: "Applications", icon: FolderOpen },
  { id: "materials", label: "Materials", icon: Library },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
] as const;

export function CreatorWorkspacePreview() {
  const [view, setView] = useState<View>("now");
  const [tasks, setTasks] = useState([false, false, false]);
  const complete = tasks.filter(Boolean).length;
  const navigation = (mobile = false) => <nav className={mobile ? styles.mobileNav : styles.nav} aria-label="Creator workspace">{!mobile && <p className={styles.navLabel}>Your workspace</p>}{nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" data-active={view === id} aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}><Icon aria-hidden="true" size={mobile ? 18 : 17} />{label}</button>)}</nav>;

  return <div className={styles.page}>
    <header className={styles.header}><Link href="/opportunities" className={styles.brand} aria-label="Missa opportunities"><img src="/brand/missa-wordmark-120.svg" alt="Missa" /></Link><span className={styles.identity}>Adebayo’s private workspace · Design preview</span></header>
    <div className={styles.shell}>{navigation()}<main className={styles.main}>
      {view === "now" ? <>
        <p className={styles.eyebrow}>Friday, September 5</p><h1 className={`${styles.headline} font-heading`}>A little progress<br />changes the whole week.</h1><p className={styles.intro}>Your work is private here. Pick up one application, one material, one useful next step.</p>
        <div className={styles.todayGrid}><section><p className={styles.sectionTitle}>Your next move <span>{complete}/3 prepared</span></p><article className={styles.priority}><div className={styles.priorityInner}><div className={styles.priorityMeta}><span>Grant</span><span>·</span><span>Closes tomorrow</span></div><h2 className="font-heading">Rauschenberg Medical Emergency Grants</h2><p>New York Foundation for the Arts</p><div className={styles.checklist} aria-label="Application preparation steps">{["Review the eligibility details", "Choose a work sample", "Prepare your emergency statement"].map((task, index) => <label key={task} className={styles.task} data-complete={tasks[index]}><input type="checkbox" checked={tasks[index]} onChange={() => setTasks(current => current.map((value, position) => position === index ? !value : value))} /><span>{task}</span>{index === 2 && <em>Suggested</em>}</label>)}</div><button type="button" className={styles.primaryAction} onClick={() => setView("applications")}>Prepare application <ArrowRight aria-hidden="true" size={17} /></button></div></article></section>
          <aside className={styles.side}><section className={styles.mini}><h3>Creative inventory</h3><p>Your reusable materials get more useful each time you apply.</p><div className={styles.numbers}><div><strong className="font-heading">3</strong><span>works</span></div><div><strong className="font-heading">1</strong><span>book</span></div></div></section><section className={styles.mini}><h3>Coming up</h3><p><strong>Sep 6</strong> · Grant deadline</p><p><strong>Sep 12</strong> · Residency deadline</p></section></aside></div>
        <section className={styles.upcoming}><p className={styles.sectionTitle}>Keep moving <span>Saved for you</span></p>{[["PH", "Poets House Chapbook Fellowship", "12 days left"], ["CO", "Open Call: Future Forms", "No deadline listed"]].map(([mark, title, detail]) => <article key={title} className={styles.opportunity}><span className={styles.monogram}>{mark}</span><div><h3>{title}</h3><p>{detail}</p></div><button type="button" onClick={() => setView("applications")}>Prepare <ArrowRight aria-hidden="true" size={14} /></button></article>)}</section>
      </> : <WorkspaceList view={view} />}
    </main></div>{navigation(true)}</div>;
}

function WorkspaceList({ view }: { view: Exclude<View, "now"> }) {
  const content = {
    applications: ["Applications", "Keep preparation, official handoffs and creator-confirmed submissions in one calm place.", [["Rauschenberg Medical Emergency Grants", "Preparing · closes tomorrow", "Resume"], ["Poets House Chapbook Fellowship", "Saved · closes Sep 12", "Start preparing"], ["Open Call: Future Forms", "Saved · no date listed", "Review"]]],
    materials: ["Your materials", "Private building blocks for your applications. Nothing here becomes public unless you publish it deliberately.", [["Three Poems", "Writing sample · used in 1 application", "Use in application"], ["Artist biography", "Short bio · last updated today", "Edit"], ["The Years of Blood", "Book · add a link or cover", "View"]]],
    calendar: ["Your calendar", "Deadlines, preparation dates and expected response windows—clearly marked when a date is only an estimate.", [["Sep 6", "Rauschenberg grant deadline", "View application"], ["Sep 12", "Poets House fellowship deadline", "Prepare"], ["Sep 22", "Expected response · sample call", "About estimated dates"]]],
  } as const;
  const [title, intro, rows] = content[view];
  return <section className={styles.alternate}><p className={styles.eyebrow}>Your private workspace</p><h1 className="font-heading">{title}</h1><p>{intro}</p><div className={styles.alternateList}>{rows.map(([name, detail, action]) => <article key={name} className={styles.alternateItem}><div><strong>{name}</strong><span>{detail}</span></div><button type="button">{action} <ArrowRight aria-hidden="true" size={14} /></button></article>)}</div></section>;
}
