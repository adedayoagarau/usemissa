import type { UserProp } from '@missa/radar-engine';

export function ProfileProps({ props }: { props: UserProp[] }) {
  if (props.length === 0) return null;
  return <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="profile-props-heading"><h2 id="profile-props-heading" className="font-heading text-xl font-medium text-foreground">A little momentum</h2><p className="mt-1 text-sm text-muted-foreground">Private notes of progress, not a score.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{props.map((prop) => <div key={prop.id} className="rounded-md border border-border bg-white p-4"><p className="font-medium text-foreground">{prop.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{prop.detail}</p></div>)}</div></section>;
}
