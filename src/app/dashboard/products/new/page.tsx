import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import { formData } from "../categories";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const m = await requireMerchant();
  const { categories, collections, optionPresets, specPresets } = await formData(m);
  return (
    <div>
      <PageHeader title="أضف منتج" back="/dashboard/products" />
      <ProductForm currency={m.store.currency} categories={categories} collections={collections} optionPresets={optionPresets} specPresets={specPresets} />
    </div>
  );
}
