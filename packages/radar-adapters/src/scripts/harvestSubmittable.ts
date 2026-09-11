import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const OUTPUT_FILE = path.join(DATA_DIR, "submittable_calls.json");

export interface SubmittablePrice {
  price: number;
  currencyCode: string;
  description: string;
}

export interface SubmittableOrg {
  id: number;
  guid: string;
  name: string;
  websiteUrl: string | null;
  isFollowing?: boolean;
  shareUrl: string;
  imageUrl: string | null;
  imageWidth?: number;
  imageHeight?: number;
}

export interface SubmittableItem {
  id: number;
  guid: string;
  name: string;
  expiration: string | null;
  organization: SubmittableOrg;
  prices: SubmittablePrice[];
  labels: string[];
  shareUrl: string;
}

async function fetchPage(page: number, retries = 3): Promise<{ total: number; hasMore: boolean; items: SubmittableItem[] }> {
  const url = `https://manager.submittable.com/api/opportunities/?page=${page}`;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return { total: 0, hasMore: false, items: [] };
}

async function run() {
  console.log("⚡ [Submittable Harvester] Connecting to Submittable Discover API...");
  const initial = await fetchPage(1);
  if (!initial || !initial.items || initial.items.length === 0) {
    console.error("❌ Failed to connect to Submittable API.");
    process.exit(1);
  }

  const total = initial.total;
  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);
  console.log(`✔ Found ${total} active opportunities across ${totalPages} pages on Submittable.`);

  const allItems = new Map<number, SubmittableItem>();
  for (const item of initial.items) {
    allItems.set(item.id, item);
  }

  const queue: number[] = [];
  for (let p = 2; p <= totalPages; p++) {
    queue.push(p);
  }

  console.log(`⚡ Fetching pages 2 through ${totalPages} across 8 concurrent workers...`);
  const concurrency = 8;
  let completed = 1;

  async function worker() {
    while (queue.length > 0) {
      const page = queue.shift();
      if (!page) break;
      const data = await fetchPage(page);
      if (data && data.items) {
        for (const it of data.items) {
          allItems.set(it.id, it);
        }
      }
      completed++;
      if (completed % 25 === 0 || completed === totalPages) {
        process.stdout.write(`\r   Progress: ${completed}/${totalPages} pages fetched (${allItems.size} unique calls)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\n✔ Completed harvest! Total unique calls gathered: ${allItems.size}`);

  const itemsArray = Array.from(allItems.values());

  // Statistics
  const orgs = new Set(itemsArray.map((i) => i.organization?.name).filter(Boolean));
  const freeCount = itemsArray.filter((i) => !i.prices || i.prices.length === 0).length;
  const paidCount = itemsArray.filter((i) => i.prices && i.prices.length > 0).length;

  console.log("\n================================================================================");
  console.log("                       SUBMITTABLE HARVEST REPORT                               ");
  console.log("================================================================================");
  console.log(`  • Total Active Calls:         ${itemsArray.length}`);
  console.log(`  • Unique Host Organizations:  ${orgs.size}`);
  console.log(`  • Free to Submit:             ${freeCount}`);
  console.log(`  • Paid / Entry Fee:           ${paidCount}`);
  console.log("================================================================================\n");

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(itemsArray, null, 2), "utf8");
  console.log(`💾 Saved structured dataset to: ${OUTPUT_FILE}`);
}

run().catch((err) => {
  console.error("Harvester failed:", err);
  process.exit(1);
});
