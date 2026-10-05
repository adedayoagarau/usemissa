import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Set it in the environment (or pass --env-file=.env.local).");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
  const check = ["The Common", "Epoch", "Brick", "Raritan", "Crab Orchard", "Water-Stone", "Southern Indiana", "Catamaran", "McSweeney", "n+1", "Barrelhouse", "Transition", "Ecotone", "Believer"];
  for (const c of check) {
    const res = await client.query("SELECT id, name, name_key, profile_kind FROM gary_profiles WHERE name ILIKE $1;", [`%${c}%`]);
    console.log(`${c} in DB (${res.rows.length}):`, res.rows.map(r => `${r.name} (${r.profile_kind}, ${r.id})`));
  }
  await client.end();
}).catch(console.error);
