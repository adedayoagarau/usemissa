/** Eyebrow and Newsreader heading shared by every section of the Tracker sheet. */
export function SheetSectionHeading({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <header className="space-y-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      <h3 id={id} className="font-heading text-xl leading-tight">
        {children}
      </h3>
    </header>
  );
}
