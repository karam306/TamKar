import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import type { StoreSeo, StoreSocial } from "@/lib/types";
import { SeoForm } from "./form";

export default async function SeoPage() {
  const { store } = await requireOwner();
  const s = store as typeof store & { seo?: StoreSeo; social?: StoreSocial };
  return (
    <div>
      <PageHeader title="Google والسوشال ميديا" back="/dashboard/settings/advanced" />
      <SeoForm seo={s.seo ?? {}} social={s.social ?? {}} name={store.name} tagline={store.tagline ?? ""} slug={store.slug} />
    </div>
  );
}
