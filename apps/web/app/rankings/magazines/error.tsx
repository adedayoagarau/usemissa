"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Empty role="alert">
        <EmptyHeader>
          <EmptyTitle>Magazine rankings couldn’t load</EmptyTitle>
          <EmptyDescription>
            Try again, or explore opportunities while the index is unavailable.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/opportunities" />}
          >
            Browse opportunities
          </Button>
        </div>
      </Empty>
    </main>
  );
}
