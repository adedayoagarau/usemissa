import { cn } from "@/lib/utils";

/**
 * The one heading every signed-in page opens with: an optional small eyebrow,
 * the page title in Instrument Sans, a sentence on what the page is for, and
 * the page's own actions on the right. Children sit under the description
 * (a notice, an allowance line) without changing the title's look.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  titleId,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  titleId?: string;
  className?: string;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
        className,
      )}
    >
      <div className="max-w-2xl min-w-0">
        {eyebrow ? (
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id={titleId}
          className="font-sans text-3xl leading-tight font-semibold tracking-tight"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
