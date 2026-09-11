import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("GET /api/opportunities/search returns standard browse payload with items and total", async () => {
  const request = new Request("http://localhost:3000/api/opportunities/search");
  const response = await GET(request);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(Array.isArray(data.items));
  assert.equal(typeof data.total, "number");
  assert.ok(data.query);
});

test("GET /api/opportunities/search?domain=visual_arts filters opportunities by visual arts", async () => {
  const request = new Request("http://localhost:3000/api/opportunities/search?domain=visual_arts");
  const response = await GET(request);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.query.domain, "visual_arts");
  assert.ok(Array.isArray(data.items));
  // All items should have visual arts medium or exhibition/commission type
  for (const item of data.items) {
    const haystack = `${item.title} ${item.genres.join(" ")} ${item.discipline ?? ""} ${item.type}`.toLowerCase();
    const hasArtsMarker =
      item.type === "exhibition" ||
      item.type === "commission" ||
      /painting|sculpture|photography|film|video|printmaking|digital art|sound art|performance|visual art|ceramics|installation|textiles|mixed media/i.test(haystack);
    assert.ok(hasArtsMarker, `Expected ${item.title} to have visual arts markers`);
  }
});

test("GET /api/opportunities/search?genres=Painting,Sculpture filters by specific genres", async () => {
  const request = new Request("http://localhost:3000/api/opportunities/search?genres=Painting,Sculpture");
  const response = await GET(request);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.query.genres.includes("Painting"));
  assert.ok(data.query.genres.includes("Sculpture"));
  assert.ok(Array.isArray(data.items));
});

test("GET /api/opportunities/search?domain=residencies filters by residency type", async () => {
  const request = new Request("http://localhost:3000/api/opportunities/search?domain=residencies");
  const response = await GET(request);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.query.domain, "residencies");
  assert.ok(Array.isArray(data.items));
  for (const item of data.items) {
    const haystack = `${item.title} ${item.genres.join(" ")} ${item.type}`.toLowerCase();
    assert.ok(haystack.includes("residency"), `Expected ${item.title} to relate to residency`);
  }
});

test("GET /api/opportunities/search default query preserves literature results without breaking", async () => {
  const request = new Request("http://localhost:3000/api/opportunities/search?category=magazines");
  const response = await GET(request);

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(Array.isArray(data.items));
  assert.equal(data.query.category, "magazines");
  for (const item of data.items) {
    assert.equal(item.type, "magazine");
  }
});
