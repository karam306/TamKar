import { requireMerchant } from "@/lib/auth";
import { storeUrl } from "@/lib/urls";
import { DesignEditor } from "./editor";

export default async function DesignPage() {
  const { store } = await requireMerchant();
  return (
    <DesignEditor
      previewUrl={`/s/${store.slug}`}
      publicUrl={storeUrl(store.slug)}
      initial={{
        theme: store.theme,
        primary_color: store.primary_color ?? "",
        logo_url: store.logo_url ?? "",
        sections: store.sections ?? [],
      }}
    />
  );
}
