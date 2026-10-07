/**
 * One setting on a settings page: its name and a sentence on what it does
 * in a narrow column, the control beside it. Rows are separated by a rule;
 * on a phone the name sits above the control.
 */
export function SettingsRow({ id, title, description, children }: { id: string; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-x-10 gap-y-3 border-t border-border py-6 first:border-t-0 first:pt-0 md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="grid content-start gap-1">
        <h3 id={id} className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid min-w-0 content-start gap-4">{children}</div>
    </section>
  );
}
