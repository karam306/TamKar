import type { Fx } from "./fx";
export type ThemeId = "classic" | "bold" | "soft";
export type Currency = "USD" | "SYP";

export type Section = (
  | { type: "announcement"; text: string }
  | {
      type: "hero";
      title: string;
      subtitle?: string;
      image?: string;
      buttonText?: string;
    }
  | { type: "categories"; title?: string }
  | { type: "featured_products"; title?: string; limit?: number }
  | { type: "image_text"; title: string; text: string; image?: string }
  | {
      type: "testimonials";
      title?: string;
      items: { name: string; text: string }[];
    }
  | { type: "whatsapp_cta"; title: string; text?: string }
  | {
      type: "collection_products";
      title?: string;
      collectionId?: string;
      limit?: number;
    }
  | {
      type: "image_banner";
      image?: string;
      title?: string;
      text?: string;
      buttonText?: string;
      link?: string;
    }
  | {
      type: "features";
      items: { icon: string; title: string; text?: string }[];
    }
  | { type: "faq"; title?: string; items: { q: string; a: string }[] }
  | { type: "rich_text"; title?: string; text: string }
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
  shipping?: ShippingSettings;
  meta_pixel_id?: string | null;
  plan?: string | null;
  paid_until?: string | null;
  business_type?: string | null;
  menus?: StoreMenus;
  seo?: StoreSeo;
  social?: StoreSocial;
};

export type MenuLink = { label: string; href: string };
export type StoreMenus = { header?: MenuLink[]; footer?: MenuLink[] };
export type StoreSeo = { title?: string; description?: string; image?: string };
export type StoreSocial = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  telegram?: string;
};

export type StorePage = {
  id: string;
  store_id: string;
  title: string;
  handle: string;
  body: string;
  published: boolean;
  created_at?: string;
};

export type Fulfillment = "pickup" | "delivery";

export type Branch = {
  id: string;
  name: string;
  note?: string | null;
  whatsapp: string;
};

export type ShippingSettings = {
  /** Delivery is optional. When off, customers pick up from the shop. */
  delivery?: boolean;
  /** Where and when to pick up, shown at checkout and in the WhatsApp message. */
  pickup_note?: string | null;
  /** Pro: more shops to pick up from, each with its own WhatsApp for orders. */
  branches?: Branch[];
  default_fee?: number | null;
  free_over?: number | null;
  rates?: { city: string; fee: number }[];
  /** How customers can pay. Kept here so it is readable on the storefront. */
  payments?: PaymentSettings;
  /** Customers can send a delivery order as a gift to someone else. */
  gift?: boolean;
  /** Dollar stores: today's rate, so customers see Syrian pounds. See lib/fx.ts. */
  fx?: Fx | null;
  /** Loyalty points settings. See lib/loyalty.ts. */
  loyalty?: { enabled: boolean; per: number; block: number; reward: number } | null;
};

/** Syrian e-wallets a customer can pay with by manual transfer. */
export type WalletId = "sham_cash" | "syriatel_cash" | "mtn_cash";
export type Wallet = {
  id: WalletId;
  /** Sham Cash wallet code (32 characters) or the Syriatel / MTN Cash phone number. */
  account: string;
  /** Account holder name, so the customer can check it before sending. */
  holder?: string | null;
  /** Picture of the merchant's receive QR code (from the wallet app). */
  qr?: string | null;
};
export type PaymentSettings = {
  /** Cash on delivery / pay at pickup. On unless the merchant turns it off. */
  cod?: boolean;
  wallets?: Wallet[];
};
/** "cod" or one of the wallets. */
export type PaymentMethod = "cod" | WalletId;

/** A return, refund or exchange on an order (update 011). */
export type OrderReturn = {
  id: string;
  order_id: string;
  kind: "refund" | "exchange";
  items: OrderLine[];
  new_items: OrderLine[];
  restocked: boolean;
  refund_amount: number;
  extra_charge: number;
  method: string | null;
  reason: string | null;
  created_at: string;
};

/** "Send as a gift": who receives it and the card message. Delivery orders only. */
export type GiftInfo = {
  to_name: string;
  to_phone: string | null;
  message: string | null;
  hide_prices: boolean;
};

export type Discount = {
  id: string;
  store_id: string;
  code: string | null;
  title: string;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
  min_subtotal: number | null;
  automatic: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
  created_at: string;
};

export type Pricing = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  code: string | null;
  free_shipping?: boolean;
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
  specs?: { name: string; value: string }[];
  /** Quantity offers (update 015): from `min` pieces, `off` percent off each piece. */
  qty_prices?: { min: number; off: number }[];
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
  discountCode?: string;
  method?: Fulfillment;
  branch?: string;
  payment?: PaymentMethod;
  gift?: GiftInfo | null;
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
  /** Set when a quantity offer applied: the price before it and the percent off. */
  listPrice?: number | null;
  offer?: number | null;
};

export type OrderStatus =
  "new" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  number: number;
  store_id: string;
  customer_name: string;
  phone: string;
  city: string | null;
  address: string | null;
  notes?: string | null;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  payment_status?: "pending" | "paid" | "partially_refunded" | "refunded";
  /** Money given back to the customer through returns (update 011). */
  refunded?: number | null;
  /** Sold on credit: the customer pays later, in parts (debt ledger). */
  on_credit?: boolean;
  /** Update 015: "pending" until the customer opens WhatsApp with the order, then "sent". */
  wa_status?: "pending" | "sent" | null;
  /** Update 014: sold inside the shop. */
  in_store?: boolean;
  customer_id?: string | null;
  source?: "online" | "manual";
  merchant_note?: string | null;
  subtotal?: number | null;
  discount_code?: string | null;
  discount_amount?: number;
  shipping_fee?: number;
  fulfillment?: Fulfillment;
  branch?: string | null;
  share_token?: string | null;
  /** How the customer said they will pay. Missing on older orders (cash). */
  payment_method?: PaymentMethod | null;
  gift?: GiftInfo | null;
  /** The exchange rate the order was placed at (dollar stores). */
  fx?: Fx | null;
  created_at: string;
};

export type QuoteLine = {
  title: string;
  variantTitle?: string | null;
  price: number;
  qty: number;
  productId?: string | null;
};

export type Quote = {
  id: string;
  number: number;
  store_id: string;
  customer_name: string;
  phone: string | null;
  items: QuoteLine[];
  discount: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  status: "sent" | "accepted" | "declined";
  share_token: string | null;
  created_at: string;
  /** The exchange rate the quote was made at (dollar stores). */
  fx?: Fx | null;
};
