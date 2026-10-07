import Link from "next/link";
import type { PortfolioWork } from "@/lib/creator-portfolio-schema";
import { caseStudyFacts } from "@/lib/creator-work-media";
import { cn } from "@/lib/utils";
import cx from "./work-media.module.css";

/**
 * Brief, role, client and outcome of a commissioned project as labelled facts.
 * A client the creator linked to a Missa directory profile links there.
 */
export function CaseStudyFacts({
  work,
  className,
}: {
  work: PortfolioWork;
  className?: string;
}) {
  const facts = caseStudyFacts(work);
  if (facts.length === 0) return null;
  return (
    <dl className={cn(cx.facts, className)}>
      {facts.map((fact) => (
        <div key={fact.label} className={cx.fact}>
          <dt className="font-mono">{fact.label}</dt>
          <dd>
            {fact.href ? (
              <Link href={fact.href}>{fact.value}</Link>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
