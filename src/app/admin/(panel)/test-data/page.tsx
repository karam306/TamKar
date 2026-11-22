export const maxDuration = 120;

import { PageHeader } from "@/components/admin-ui";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { SEED_SLUGS } from "@/lib/seed-stores";
import { supabaseAdmin } from "@/lib/supabase";
import { SeedForms } from "./forms";

export default async function TestDataPage() {
  await requirePlatformAdmin();
  const db = supabaseAdmin();
  const { data } = await db.from("stores").select("name, slug, owner_id").in("slug", SEED_SLUGS);
  const logins = await Promise.all(
    (data ?? []).map(async (s) => {
      const { data: u } = await db.auth.admin.getUserById(s.owner_id as string);
      const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "short", timeStyle: "short" }) : "never");
      return {
        name: s.name as string,
        slug: s.slug as string,
        email: u.user?.email ?? "?",
        info: `confirmed: ${u.user?.email_confirmed_at ? "yes" : "NO"} · updated: ${fmt(u.user?.updated_at)} · last login: ${fmt(u.user?.last_sign_in_at)}`,
      };
    }),
  );
  return (
    <div className="space-y-4">
      <PageHeader title="متاجر تجريبية" />
      {logins.length > 0 && (
        <section className="card space-y-2 p-4">
          <h2 className="text-sm font-semibold">إيميلات الدخول للمتاجر التجريبية</h2>
          {logins.map((l) => (
            <div key={l.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 p-3 text-[13px]">
              <b>{l.name}</b>
              <span dir="ltr" className="select-all font-mono">
                {l.email}
              </span>
              <span dir="ltr" className="w-full text-left text-xs text-muted">
                {l.info}
              </span>
            </div>
          ))}
        </section>
      )}
      <SeedForms existing={logins.map((l) => l.slug)} />
    </div>
  );
}
