import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { guideType } from "@/components/missa/guide-typography";
import { guideArticlesFor, type GuideArticle } from "@/lib/guideArticles";

/**
 * Links from a page outside /guides to the guides that answer its question,
 * chosen in lib/guideArticles.ts. Renders nothing when no guide fits. The
 * page places it inside its own column; this adds no outer spacing.
 */
export function GuideLinks({
  path,
  articles = guideArticlesFor(path),
}: {
  /** The page's own path, used to choose the guides. */
  path: string;
  /** Overrides the choice, for pages that pick by their record. */
  articles?: GuideArticle[];
}) {
  if (!articles.length) return null;
  return (
    <section
      aria-labelledby="guide-links-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <p className={guideType.eyebrow}>Guides</p>
          <h2
            id="guide-links-heading"
            className="font-heading text-2xl font-medium tracking-tight text-balance"
          >
            Read before you apply
          </h2>
        </div>
        <Link href="/guides" className={guideType.link}>
          All guides
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug} className="grid">
            <Item
              variant="outline"
              className="h-full items-start"
              render={<Link href={`/guides/${article.slug}`} />}
            >
              <ItemContent>
                <ItemTitle>{article.title}</ItemTitle>
                <ItemDescription>{article.summary}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              </ItemActions>
            </Item>
          </li>
        ))}
      </ul>
    </section>
  );
}
