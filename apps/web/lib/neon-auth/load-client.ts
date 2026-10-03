"use client";

type NeonAuthClient = typeof import('./client').neonAuthClient;

let clientModule: Promise<typeof import('./client')> | undefined;

/**
 * The Neon Auth client is the heaviest script on the sign-in pages and is
 * needed only once someone acts, so forms load it on demand instead of with
 * the page. A failed download is retried on the next call.
 */
export function loadNeonAuthClient(): Promise<NeonAuthClient> {
  clientModule ??= import('./client').catch((problem: unknown) => {
    clientModule = undefined;
    throw problem;
  });
  return clientModule.then((module) => module.neonAuthClient);
}
