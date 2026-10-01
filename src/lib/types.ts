export type Availability = "in_stock" | "out_of_stock" | "on_request" | "unknown";

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  site_login: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierLite = Pick<Supplier, "id" | "name" | "whatsapp" | "website" | "active">;

export interface Category {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Part {
  id: string;
  name: string;
  category_id: string;
  brand: string | null;
  device_model: string | null;
  technology: string | null;
  quality: string | null;
  internal_code: string | null;
  manufacturer_code: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierPart {
  id: string;
  part_id: string;
  supplier_id: string;
  supplier_code: string | null;
  product_url: string | null;
  price: number;
  availability: Availability;
  notes: string | null;
  checked_at: string;
  created_at: string;
  updated_at: string;
}

/** Oferta de um fornecedor já com os dados básicos do fornecedor. */
export interface Offer extends SupplierPart {
  supplier: SupplierLite;
}

/** Linha retornada pela função search_parts. */
export interface PartSummary {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  brand: string | null;
  device_model: string | null;
  technology: string | null;
  quality: string | null;
  internal_code: string | null;
  active: boolean;
  supplier_count: number;
  in_stock_count: number;
  best_price: number | null;
  best_supplier_id: string | null;
  best_supplier_name: string | null;
  best_availability: Availability | null;
  last_checked_at: string | null;
  oldest_checked_at: string | null;
  total_count: number;
}

export interface SimilarPart {
  id: string;
  name: string;
  category_name: string;
  brand: string | null;
  device_model: string | null;
  similarity: number;
}

export interface PriceHistoryRow {
  id: string;
  created_at: string;
  old_price: number | null;
  new_price: number;
  part_id: string;
  part_name: string;
  supplier_id: string;
  supplier_name: string;
  supplier_part_id: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  role: "admin" | "user";
}

export interface FilterOptions {
  brands: string[];
  models: string[];
  technologies: string[];
  qualities: string[];
}

export interface DashboardStats {
  parts: number;
  suppliers: number;
  offers: number;
  updated_7d: number;
  stale: number;
}
