import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin-ui";
import { requireMerchant } from "@/lib/auth";
import type { Product } from "@/lib/types";
import { storeUrl } from "@/lib/urls";
import { deleteProduct, duplicateProduct } from "../actions";
import { formData } from "../categories";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const m = await requireMerchant();
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await m.db.from("products").select("*").eq("id", id).eq("store_id", m.store.id).maybeSingle();
  if (!data) notFound();
  const product = { ...(data as Product), price: Number(data.price), compare_at_price: data.compare_at_price == null ? null : Number(data.compare_at_price) };
  const { categories, collections } = await formData(m);

  return (
    <div>
      <PageHeader
        title={product.title}
        back="/dashboard/products"
        badges={<span className={`badge ${product.active ? "bg-[#affebf] text-[#014b40]" : "bg-[#e3e3e3] text-[#616161]"}`}>{product.active ? "نشط" : "مسودة"}</span>}
        actions={
          <>
            <form action={duplicateProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button type="submit" className="btn btn-outline">
                نسخ
              </button>
            </form>
            <a href={`${storeUrl(m.store.slug)}/p/${product.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              معاينة ↗
            </a>
          </>
        }
      />
      {created && <p className="card mb-4 border-r-4 border-[#29845a] p-3 text-[13px]">✓ انضاف المنتج</p>}
      <ProductForm product={product} currency={m.store.currency} categories={categories} collections={collections} />
      <details className="card mt-6 p-4 text-[13px]">
        <summary className="cursor-pointer font-semibold text-red-700">حذف المنتج</summary>
        <form action={deleteProduct} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="id" value={product.id} />
          <span className="text-muted">الحذف نهائي وما بيرجع.</span>
          <button type="submit" className="btn !bg-[#c70a24]">
            احذف المنتج
          </button>
        </form>
      </details>
    </div>
  );
}
