import fs from "fs";
import csv from "csv-parser";
import { supabase } from "../db/supabase.js";

export async function ingestCSVs(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".csv"));

  for (const file of files) {
    const rows = [];

    await new Promise(resolve => {
      fs.createReadStream(`${dir}/${file}`)
        .pipe(csv())
        .on("data", row => rows.push(row))
        .on("end", resolve);
    });

    for (const r of rows) {
      await supabase.rpc("rpc_upsert_lead", {
        p_name: r.name,
        p_email: r.email,
        p_company: r.company,
        p_role: r.role,
        p_source: "csv"
      });
    }

    fs.renameSync(`${dir}/${file}`, `${dir}/../processed/${file}`);
  }
}
