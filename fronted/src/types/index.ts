// ============================================================
// PRODUCT / CATALOG
// ============================================================

export interface Product {
  id: string;
  name: string;
  brand: string;
  category:
    | "footwear"
    | "smartwatch"
    | "electronics"
    | "accessories"
    | "apparel"
    | string;

  price: number;
  original_price: number;
  description: string;

  features: string[];
  upsell_product_ids: string[];
  colors: string[];
  image_url: string;

  in_stock: boolean;
  stock_quantity: number;
  sizes: string[];

  discount_percent: number;
  rating: number;
  reviews_count: number;
  is_featured: boolean;
  sku: string;
  created_at?: string;
}
export interface ProductCreate {
  name: string;
  brand: string;
  category: string;

  price: number;
  original_price: number;

  rating?: number;
  stock_quantity: number;

  sizes: string[];
  colors: string[];

  image_url: string;
  description: string;

  features: string[];
  upsell_product_ids?: string[];

  is_featured?: boolean;
}

export interface ProductUpdate {
  name?: string;
  brand?: string;
  category?: string;

  price?: number;
  original_price?: number;

  stock_quantity?: number;
  in_stock?: boolean;

  sizes?: string[];
  colors?: string[];

  image_url?: string;
  description?: string;

  features?: string[];
  upsell_product_ids?: string[];

  is_featured?: boolean;
}

export interface CatalogStats {
  total_skus: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_value: number;
  categories: string[];
}


// ============================================================
// AI AGENT
// ============================================================

export interface AgentReasoningStep {
  intent_summary: string;

  budget_extracted: number | null;
  category_extracted: string | null;

  catalog_matches_found: number;

  inventory_status: string;

  recommendation_rationale: string;
  upsell_strategy: string;

  execution_time_ms: number;
  confidence_score: number;
}

export interface ChatMessage {
  id: string;

  role: "user" | "assistant" | "system";

  content: string;

  timestamp: string;

  agent_reasoning?: AgentReasoningStep | null;

  recommended_product_ids?: string[];
  upsell_product_ids?: string[];

  interactive_action?: string | null;
}

export interface ChatSession {
  id: string;

  title: string;

  messages: ChatMessage[];

  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  session_id?: string;

  message: string;

  budget_filter?: number;
  category_filter?: string;
}

export interface ChatResponse {
  session_id: string;

  reply: string;

  reasoning: AgentReasoningStep;

  recommended_products: Product[];
  upsell_products: Product[];

  message_id: string;
}


// ============================================================
// ORDER / CHECKOUT
// ============================================================

export interface Address {
  name: string;
  phone: string;

  address_line: string;

  city: string;
  state: string;

  pincode: string;
}

export interface OrderItem {
  product_id: string;

  name: string;
  brand: string;

  price: number;
  original_price: number;

  quantity: number;

  size?: string;
  color?: string;

  is_upsell: boolean;

  image_url?: string;
}

export interface Order {
  id: string;

  // Razorpay
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;

  customer_name: string;
  customer_email: string;
  customer_phone: string;

  shipping_address: Address;

  items: OrderItem[];

  subtotal: number;
  bundle_discount: number;
  tax: number;
  total_amount: number;

  currency: string;

  status:
    | "created"
    | "processing"
    | "paid"
    | "failed"
    | "shipped";

  payment_method?:
    | "upi"
    | "card"
    | "netbanking"
    | "wallet"
    | string
    | null;

  payment_details?: Record<string, unknown>;

  agent_thought_snapshot?: AgentReasoningStep | null;

  created_at: string;

  paid_at?: string | null;
}

export interface OrderCreate {
  customer_name: string;
  customer_email: string;
  customer_phone: string;

  shipping_address: Address;

  items: OrderItem[];

  bundle_discount: number;

  agent_thought_snapshot?: AgentReasoningStep | null;
}


// ============================================================
// RAZORPAY PAYMENT VERIFICATION
// ============================================================

export interface PaymentVerifyRequest {
  razorpay_order_id: string;

  razorpay_payment_id: string;

  razorpay_signature: string;

  payment_method:
    | "upi"
    | "card"
    | "netbanking"
    | "wallet";

  payment_details: Record<string, unknown>;
}


// ============================================================
// CAMPAIGNS
// ============================================================

export interface CampaignMetrics {
  sent_count: number;

  clicks: number;

  orders_generated: number;

  revenue_generated: number;

  conversion_rate: number;
}

export interface Campaign {
  id: string;

  title: string;

  goal:
    | "clearance"
    | "new_launch"
    | "cross_sell_boost"
    | "retargeting"
    | "flash_sale"
    | string;

  target_audience: string;

  status:
    | "active"
    | "draft"
    | "scheduled"
    | "paused"
    | "completed";

  channels: string[];

  whatsapp_copy: string;
  sms_copy: string;

  discount_code: string;
  discount_percent: number;

  forecasted_roi: string;

  target_category: string;

  created_by_agent: boolean;

  metrics: CampaignMetrics;

  created_at: string;
}

export interface CampaignOrchestrateRequest {
  prompt?: string;

  target_category?: string;

  goal?: string;

  discount_percent?: number;
}

export interface CampaignCreate {
  title: string;

  goal: string;

  target_audience: string;

  channels: string[];

  whatsapp_copy: string;

  sms_copy: string;

  discount_code: string;

  discount_percent: number;
}


// ============================================================
// AUDIT LEDGER
// ============================================================

export interface AuditEvent {
  id: string;

  event_type:
    | "INTENT_PARSED"
    | "CATALOG_SEARCH"
    | "INVENTORY_CHECK"
    | "RECOMMENDATION_DISPATCHED"
    | "UPSELL_TRIGGERED"
    | "ORDER_CREATED"
    | "PAYMENT_VERIFIED"
    | "RAZORPAY_PAYMENT_SUCCESS"
    | "CAMPAIGN_AUTO_LAUNCHED"
    | string;

  session_id?: string | null;

  order_id?: string | null;

  title: string;

  description: string;

  details: Record<string, unknown>;

  status:
    | "success"
    | "warning"
    | "error"
    | "info";

  latency_ms: number;

  created_at: string;
}

export interface AuditMetrics {
  total_gmv: number;

  total_orders: number;

  ai_conversion_rate: number;

  catalog_skus_count: number;

  low_stock_count: number;

  avg_agent_latency_ms: number;

  payment_success_rate: number;
}