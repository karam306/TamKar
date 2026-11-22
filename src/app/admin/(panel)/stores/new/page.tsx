import { PageHeader } from "@/components/admin-ui";
import { loadSalesmen } from "@/app/admin/data";
import { NewMerchantForm } from "./form";

export default async function NewStorePage() {
  const salesmen = (await loadSalesmen()).filter((m) => m.active);
  return (
    <div>
      <PageHeader title="متجر جديد لتاجر" back="/admin/stores" />
      <NewMerchantForm salesmen={salesmen.map((m) => ({ id: m.id, name: m.name, code: m.code }))} />
    </div>
  );
}
