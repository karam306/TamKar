import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import type { Product } from "@/lib/types";
import { deleteProduct } from "../actions";
import { storeCategories } from "../categories";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await m.db.from("products").select("*").eq("id", id).eq("store_id", m.store.id).maybeSingle();
  if (!data) notFound();
  const product = data as Product;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/products" className="text-sm text-muted">
        → المنتجات
      </Link>
      <h1 className="text-2xl">تعديل المنتج</h1>
      <ProductForm product={{ ...product, price: Number(product.price) }} currency={m.store.currency} categories={await storeCategories(m)} />
      <details className="rounded-theme bg-white p-5 text-sm">
        <summary className="cursor-pointer text-red-700">حذف المنتج</summary>
        <form action={deleteProduct} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="id" value={product.id} />
          <span className="text-muted">الحذف نهائي وما بيرجع.</span>
          <button type="submit" className="btn !bg-red-600 !py-1.5 text-sm">
            أكيد، احذفه
          </button>
        </form>
      </details>
    </div>
  );
}
