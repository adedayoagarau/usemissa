import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSENT_ANSWERED_ATTRIBUTE,
  CONSENT_COOKIE,
  CONSENT_STORAGE_KEY,
  consentAnsweredScript,
} from "@/lib/analyticsConsent";

/** Runs the head script against a minimal document and returns <html> attributes. */
function markAnswered({
  stored,
  cookie = "",
  storageBlocked = false,
}: {
  stored?: string;
  cookie?: string;
  storageBlocked?: boolean;
}): Record<string, string> {
  const attributes: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      if (storageBlocked) throw new Error("storage blocked");
      return key === CONSENT_STORAGE_KEY ? (stored ?? null) : null;
    },
  };
  const document = {
    cookie,
    documentElement: {
      setAttribute(name: string, value: string) {
        attributes[name] = value;
      },
    },
  };
  new Function("localStorage", "document", consentAnsweredScript())(
    localStorage,
    document,
  );
  return attributes;
}

test("the banner stays visible for visitors who have not answered", () => {
  assert.deepEqual(markAnswered({}), {});
  assert.deepEqual(markAnswered({ stored: "maybe" }), {});
  assert.deepEqual(markAnswered({ cookie: `x${CONSENT_COOKIE}=accepted` }), {});
});

test("a stored answer hides the banner before first paint", () => {
  assert.deepEqual(markAnswered({ stored: "accepted" }), {
    [CONSENT_ANSWERED_ATTRIBUTE]: "accepted",
  });
  assert.deepEqual(
    markAnswered({ cookie: `a=1; ${CONSENT_COOKIE}=declined; b=2` }),
    { [CONSENT_ANSWERED_ATTRIBUTE]: "declined" },
  );
  assert.deepEqual(
    markAnswered({
      storageBlocked: true,
      cookie: `${CONSENT_COOKIE}=accepted`,
    }),
    { [CONSENT_ANSWERED_ATTRIBUTE]: "accepted" },
  );
});
