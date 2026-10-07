import assert from "node:assert/strict";
import test from "node:test";
import {
  QR_QUIET_ZONE,
  QrAddressError,
  encodeQr,
  qrAddress,
  qrPath,
  qrViewSize,
} from "./qr-code";

const profile = "https://www.usemissa.com/@rileychen";

test("the same address always gives the same code", () => {
  const first = encodeQr(profile);
  const second = encodeQr(profile);
  assert.deepEqual(first, second);
  assert.equal(qrPath(first), qrPath(second));
});

test("a different address gives a different code", () => {
  assert.notDeepEqual(
    encodeQr(profile).rows,
    encodeQr("https://www.usemissa.com/@nadiaokafor").rows,
  );
});

test("only full https addresses are encoded", () => {
  for (const refused of [
    "http://www.usemissa.com/@rileychen",
    "javascript:alert(1)",
    "data:text/html,hello",
    "mailto:riley@example.com",
    "ftp://example.com/file",
    "//www.usemissa.com/@rileychen",
    "/@rileychen",
    "www.usemissa.com/@rileychen",
    "https://",
    "https:// not a host",
    "https://user:secret@www.usemissa.com/",
    "",
    "   ",
  ]) {
    assert.throws(() => encodeQr(refused), QrAddressError, refused);
  }
});

test("a value in any letter case or with spaces around it is accepted", () => {
  assert.equal(
    qrAddress("  HTTPS://www.usemissa.com/@rileychen  "),
    "https://www.usemissa.com/@rileychen",
  );
});

test("an address outside ASCII is percent-encoded before it is drawn", () => {
  const address = qrAddress("https://www.usemissa.com/@zoë");
  assert.match(address, /^[\x20-\x7e]+$/);
  assert.equal(encodeQr("https://www.usemissa.com/@zoë").address, address);
});

test("the module matrix is square and matches its version", () => {
  const code = encodeQr(profile);
  assert.equal(code.size, code.version * 4 + 17);
  assert.equal(code.rows.length, code.size);
  for (const row of code.rows) assert.equal(row.length, code.size);
});

test("the version grows with the length of the address", () => {
  const short = encodeQr("https://usemissa.com/@a");
  const medium = encodeQr(`https://usemissa.com/@a/${"x".repeat(60)}`);
  const long = encodeQr(`https://usemissa.com/@a/${"x".repeat(400)}`);
  assert.ok(short.version < medium.version);
  assert.ok(medium.version < long.version);
  assert.ok(long.size > medium.size && medium.size > short.size);
});

test("an address too long for any code is refused, not truncated", () => {
  assert.throws(
    () => encodeQr(`https://usemissa.com/${"x".repeat(5000)}`),
    QrAddressError,
  );
});

test("the three finder patterns sit in the corners", () => {
  const { rows, size } = encodeQr(profile);
  const finder = (top: number, left: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const ring = y === 0 || y === 6 || x === 0 || x === 6;
        const core = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        assert.equal(rows[top + y][left + x], ring || core, `${top},${left}`);
      }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);
});

test("the drawing leaves a quiet zone of four modules", () => {
  const code = encodeQr(profile);
  assert.equal(QR_QUIET_ZONE, 4);
  assert.equal(qrViewSize(code), code.size + 8);
  const coordinates = [...qrPath(code).matchAll(/M(\d+) (\d+)h(\d+)/g)].map(
    (match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      width: Number(match[3]),
    }),
  );
  assert.ok(coordinates.length > 0);
  for (const { x, y, width } of coordinates) {
    assert.ok(x >= QR_QUIET_ZONE && y >= QR_QUIET_ZONE);
    assert.ok(x + width <= code.size + QR_QUIET_ZONE);
    assert.ok(y < code.size + QR_QUIET_ZONE);
  }
});

test("the path draws exactly the dark modules", () => {
  const code = encodeQr(profile);
  const painted = new Set<string>();
  for (const match of qrPath(code).matchAll(/M(\d+) (\d+)h(\d+)/g))
    for (let i = 0; i < Number(match[3]); i++)
      painted.add(
        `${Number(match[1]) + i - QR_QUIET_ZONE},${Number(match[2]) - QR_QUIET_ZONE}`,
      );
  const dark = new Set<string>();
  code.rows.forEach((row, y) =>
    row.forEach((on, x) => on && dark.add(`${x},${y}`)),
  );
  assert.deepEqual(painted, dark);
});
