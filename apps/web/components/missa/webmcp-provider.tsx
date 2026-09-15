"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  classifyWebMcpSurface,
  createMissaWebMcpTools,
  type MissaWebMcpTool,
} from "@/lib/webmcp";

type ModelContext = {
  registerTool: (
    tool: MissaWebMcpTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ) => Promise<void>;
};

function currentModelContext(): ModelContext | undefined {
  return (
    document as Document & {
      modelContext?: ModelContext;
    }
  ).modelContext;
}

async function requestJson(
  path: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error).slice(0, 300)
        : `Missa returned HTTP ${response.status}.`;
    throw new Error(error);
  }
  return body;
}

export function WebMcpProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.size ? `?${searchParams.toString()}` : "";

  useEffect(() => {
    const modelContext = currentModelContext();
    const surface = classifyWebMcpSurface(pathname);
    if (!modelContext || surface === "blocked") return;

    const registration = new AbortController();
    const tools = createMissaWebMcpTools({
      pathname,
      search,
      surface,
      request: requestJson,
      pageContext: () => ({
        title: document.title || undefined,
        primaryHeading:
          document
            .querySelector("main h1")
            ?.textContent?.trim()
            .slice(0, 300) || undefined,
      }),
    });

    void (async () => {
      for (const tool of tools) {
        if (registration.signal.aborted) break;
        try {
          await modelContext.registerTool(tool, {
            signal: registration.signal,
          });
        } catch {
          if (registration.signal.aborted) break;
          // WebMCP is progressive enhancement. A browser may expose an older
          // draft, deny the permission, or reject one unsupported schema.
        }
      }
    })();

    return () => registration.abort();
  }, [pathname, search]);

  return null;
}
