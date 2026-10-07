/** Field rows in a detail pane: a muted name and its value on one line. */
export function DetailFields({ fields }: { fields: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
      {fields.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="min-w-0 text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
