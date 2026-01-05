
import { createClient } from "@supabase/supabase-js";
import { differenceInDays, parseISO } from "date-fns";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUrgent() {
  const { data: cars, error } = await supabase
    .from("cars")
    .select("id, plate_number, insurance_expiry, roadtax_expiry")
    .neq("status", "inactive");

  if (error) {
    console.error("Error:", error);
    return;
  }

  const today = new Date();
  console.log("Checking vs Today:", today.toISOString());
  
  let count = 0;
  cars.forEach((c: any) => {
    let isUrgent = false;
    if (c.insurance_expiry) {
        const days = differenceInDays(parseISO(c.insurance_expiry), today);
        if (days <= 1) {
            console.log(`[URGENT] ${c.plate_number} Insurance: ${c.insurance_expiry} (${days} days)`);
            isUrgent = true;
        } else {
             // console.log(`[OK] ${c.plate_number} Insurance: ${c.insurance_expiry} (${days} days)`);
        }
    }
    if (c.roadtax_expiry) {
        const days = differenceInDays(parseISO(c.roadtax_expiry), today);
        if (days <= 1) {
            console.log(`[URGENT] ${c.plate_number} Roadtax: ${c.roadtax_expiry} (${days} days)`);
            isUrgent = true;
        }
    }
    if (isUrgent) count++;
  });

  console.log(`Found ${count} urgent cars.`);
}

checkUrgent();
