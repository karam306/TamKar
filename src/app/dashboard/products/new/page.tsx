import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import { ProGate } from "@/components/pro-gate";
import { productRoom } from "@/lib/plan-guard";
import { formData } from "../categories";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const m = await requireAccess("products");
  if ((await productRoom(m.db, m.store)) < 1)
    return (
      <div>
        <PageHeader title="إضافة منتج" back="/dashboard/products" />
        <ProGate feature="إضافة أكثر من 100 منتج" />
      </div>
    );
  const { categories, collections, optionPresets, specPresets } =
    await formData(m);
  return (
    <div>
      <PageHeader title="إضافة منتج" back="/dashboard/products" />
      <ProductForm
        currency={m.store.currency}
        categories={categories}
        collections={collections}
        optionPresets={optionPresets}
        specPresets={specPresets}
      />
    </div>
  );
}
