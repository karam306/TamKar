import { PageHeader } from "@/components/admin-ui";
import { requireAccess } from "@/lib/auth";
import type { StoreMenus } from "@/lib/types";
import { MenuEditor } from "./editor";

export default async function NavigationPage() {
  const { store, db } = await requireAccess("design");
  const [{ data: cols }, { data: pages }] = await Promise.all([
    db
      .from("collections")
      .select("title, handle")
      .eq("store_id", store.id)
      .order("title"),
    db
      .from("pages")
      .select("title, handle")
      .eq("store_id", store.id)
      .order("created_at"),
  ]);
  const targets = [
    { label: "الرئيسية", href: "/" },
    { label: "كل المنتجات", href: "/products" },
    ...(cols ?? []).map((c) => ({
      label: `مجموعة: ${c.title}`,
      href: `/collections/${c.handle}`,
    })),
    ...(pages ?? []).map((p) => ({
      label: `صفحة: ${p.title}`,
      href: `/pages/${p.handle}`,
    })),
  ];
  return (
    <div>
      <PageHeader title="قوائم المتجر" back="/dashboard/settings/advanced" />
      <MenuEditor
        initial={(store as { menus?: StoreMenus }).menus ?? {}}
        targets={targets}
      />
    </div>
  );
}
