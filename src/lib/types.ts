export type ThemeId = "classic" | "bold" | "soft";
export type Currency = "USD" | "SYP";

export type Section = (
  | { type: "announcement"; text: string }
  | { type: "hero"; title: string; subtitle?: string; image?: string; buttonText?: string }
  | { type: "categories"; title?: string }
  | { type: "featured_products"; title?: string; limit?: number }
  | { type: "image_text"; title: string; text: string; image?: string }
  | { type: "testimonials"; title?: string; items: { name: string; text: string }[] }
  | { type: "whatsapp_cta"; title: string; text?: string }
) & { hidden?: boolean };

export type SectionType = Section["type"];

export type Store = {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  logo_url?: string | null;
  whatsapp: string; // international format without +, e.g. 963912345678
  city?: string;
  currency: Currency;
  theme: ThemeId;
  primary_color?: string | null;
  sections: Section[];
  delivery_note?: string;
  status: "active" | "suspended";
};

export type Product = {
  id: string;
  store_id: string;
  title: string;
  description?: string;
  price: number;
  compare_at_price?: number | null;
  images: string[];
  category?: string | null;
  stock?: number | null; // null = unlimited
  active: boolean;
  sku?: string | null;
  options?: ProductOption[];
  variants?: Variant[];
  collection_ids?: string[];
};

export type ProductOption = { name: string; values: string[] };

export type Variant = {
  id: string;
  title: string; // "M / أحمر"
  options: string[];
  price: number;
  compare_at_price?: number | null;
  stock?: number | null;
  sku?: string | null;
};

export type Collection = {
  id: string;
  store_id: string;
  title: string;
  handle: string;
  description?: string | null;
  image?: string | null;
};

export type Customer = {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  city?: string | null;
  address?: string | null;
  note?: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at?: string | null;
  created_at: string;
};

export type CartItem = { productId: string; variantId?: string; qty: number };

export type OrderInput = {
  customerName: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  items: CartItem[];
};

export type OrderLine = {
  productId: string;
  variantId?: string | null;
  title: string;
  variantTitle?: string | null;
  price: number;
  qty: number;
  image?: string | null;
};

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  number: number;
  store_id: string;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  notes?: string | null;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  payment_status?: "pending" | "paid";
  customer_id?: string | null;
  source?: "online" | "manual";
  merchant_note?: string | null;
  created_at: string;
};
