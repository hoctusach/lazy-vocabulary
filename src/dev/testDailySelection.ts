// src/dev/testDailySelection.ts
import { createClient } from "@supabase/supabase-js";
import { getDailySelectionV2 } from "@/lib/db/supabase";

// ⚠️ Hardcode for testing only
const SUPABASE_URL = "https://vijvcojvemkzgpzowzh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi..."; // full anon key

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  try {
    const rows = await getDailySelectionV2(client, {
      userKey: "mimi",
      mode: "Light",
      count: 10,
    });
    console.log("✅ Result:", rows);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

run();
