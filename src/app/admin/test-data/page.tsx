export const maxDuration = 120;

import { PageHeader } from "@/components/admin-ui";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { SEED_SLUGS } from "@/lib/seed-stores";
import { supabaseAdmin } from "@/lib/supabase";
import { SeedForms } from "./forms";

export default async function TestDataPage() {
  await requirePlatformAdmin();
  const { data } = await supabaseAdmin().from("stores").select("slug").in("slug", SEED_SLUGS);
  return (
    <div className="space-y-4">
      <PageHeader title="متاجر تجريبية" />
      <SeedForms existing={(data ?? []).map((s) => s.slug as string)} />
    </div>
  );
}
