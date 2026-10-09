import assert from "node:assert/strict";
import test from "node:test";
import { zoteroSource, zoteroCredential, zoteroPage } from "./writing-zotero";
import { zoteroItems, verifyZoteroCredential } from "./writing-zotero-provider";
const credential = { userId: "1234", apiKey: "EXAMPLEKEY12345678" };
test("Zotero import keeps recorded metadata, stable provenance and safe URLs", () => {
  const input = {
    key: "ABCD1234",
    data: {
      itemType: "journalArticle",
      title: "Real title",
      date: "2025",
      creators: [
        { creatorType: "author", firstName: "Ada", lastName: "Writer" },
      ],
      url: "javascript:alert(1)",
      publicationTitle: "Journal",
      pages: "14–19",
    },
  };
  const source = zoteroSource(input, "1234")!;
  assert.equal(source.id, "zotero_1234_ABCD1234");
  assert.equal(source.authorFamily, "Writer");
  assert.equal(source.url, "");
  assert.equal(source.publicationDate, "2025");
  assert.equal(source.page, "14–19");
  assert.equal(source.citation, "");
  assert.equal(
    zoteroSource(
      { ...input, data: { ...input.data, itemType: "attachment" } },
      "1234",
    ),
    null,
  );
});
test("Zotero credentials and paging reject malformed input", () => {
  assert.deepEqual(zoteroCredential(credential), credential);
  assert.equal(
    zoteroCredential({ ...credential, userId: "../groups/1" }),
    null,
  );
  assert.equal(zoteroPage("-1"), null);
  assert.equal(zoteroPage("100001"), null);
  assert.equal(zoteroPage(null), 0);
});
test("provider sends key only in header, uses fixed HTTPS origin and bounded pagination", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.zotero.org");
    assert.equal(url.searchParams.get("key"), null);
    assert.equal(
      new Headers(init?.headers).get("Zotero-API-Key"),
      credential.apiKey,
    );
    assert.equal(init?.redirect, "error");
    return Response.json(
      Array.from({ length: 25 }, () => ({
        key: "ABCD1234",
        data: { title: "Reference", itemType: "book" },
      })),
    );
  };
  const result = await zoteroItems(credential, "writing", 25, fetcher);
  assert.equal(result.nextStart, 50);
  assert.equal(result.sources.length, 25);
});
test("connection verifies personal identity and rejects excess permissions", async () => {
  const fetcher =
    (data: unknown): typeof fetch =>
    async (input, init) => {
      assert.equal(String(input), "https://api.zotero.org/keys/current");
      assert.equal(
        new Headers(init?.headers).get("Zotero-API-Key"),
        credential.apiKey,
      );
      return Response.json(data);
    };
  await verifyZoteroCredential(
    credential,
    fetcher({ userID: 1234, access: { user: { library: true }, groups: {} } }),
  );
  await assert.rejects(
    verifyZoteroCredential(
      credential,
      fetcher({ userID: 9999, access: { user: { library: true } } }),
    ),
  );
  await assert.rejects(
    verifyZoteroCredential(
      credential,
      fetcher({
        userID: 1234,
        access: { user: { library: true, write: true } },
      }),
    ),
  );
});
import { boundedZoteroText, zoteroSameOrigin } from "./writing-zotero-body";
test("connection request compares browser origin to Host and rejects missing/cross-site origins", () => {
  assert.equal(
    zoteroSameOrigin(
      new Request("http://localhost:3101/api", {
        headers: { origin: "http://127.0.0.1:3101", host: "127.0.0.1:3101" },
      }),
    ),
    true,
  );
  assert.equal(
    zoteroSameOrigin(
      new Request("https://missa.example/api", {
        headers: { origin: "https://other.example", host: "missa.example" },
      }),
    ),
    false,
  );
  assert.equal(
    zoteroSameOrigin(new Request("https://missa.example/api")),
    false,
  );
});
test("connection bodies stop at their byte limit", async () => {
  await assert.rejects(
    boundedZoteroText(new Response("x".repeat(2049)).body, 2048),
  );
  assert.equal(await boundedZoteroText(new Response("abc").body, 3), "abc");
});
