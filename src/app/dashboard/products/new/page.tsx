import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { ProductForm } from "../product-form";
import { storeCategories } from "../categories";

export default async function NewProductPage() {
  const m = await requireMerchant();
  return (
    <div className="space-y-4">
      <Link href="/dashboard/products" className="text-sm text-muted">
        → المنتجات
      </Link>
      <h1 className="text-2xl">منتج جديد</h1>
      <ProductForm currency={m.store.currency} categories={await storeCategories(m)} />
    </div>
  );
}
