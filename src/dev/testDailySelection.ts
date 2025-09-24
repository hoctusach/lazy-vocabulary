import { getSupabaseClient } from "@/lib/supabaseClient";
import { getDailySelectionV2 } from "@/lib/db/supabase";

async function run() {
  const client = getSupabaseClient();
  try {
    const rows = await getDailySelectionV2(client, {
      userKey: "mimi",
      mode: "Light",
      count: 10,
    });
    console.log("Result:", rows);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
