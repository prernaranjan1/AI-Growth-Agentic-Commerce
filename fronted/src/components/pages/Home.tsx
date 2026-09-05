import React, { useEffect, useState } from "react";

import {
  Navbar,
  type TabView,
} from "@/components/Navbar";

import { ChatPanel } from "@/components/AIChat/ChatPanel";

import { InventoryManager } from "@/components/Merchant/InventoryManager";

import { CampaignOrchestrator } from "@/components/Merchant/CampaignOrchestrator";

import { AuditLedger } from "@/components/Audit/AuditLedger";

import RazorpayModal from "@/components/Checkout/RazorpayModal";

import OrderSuccessModal from "@/components/Checkout/OrderSuccessModal";

import CartDrawer from "@/components/Checkout/CartDrawer";

import type {
  Product,
  OrderItem,
  Order,
  OrderCreate,
  Address,
} from "@/types";

import { Toaster, toast } from "sonner";

import { apiPost } from "@/lib/api";

export default function Home() {
  // ============================================
  // NAVIGATION STATE
  // ============================================

  const [currentTab, setCurrentTab] =
    useState<TabView>("shopping_agent");

  const [theme, setTheme] = useState<
    "dark" | "light"
  >("dark");

  // ============================================
  // CART STATE
  // ============================================

  const [cartItems, setCartItems] =
    useState<OrderItem[]>([]);

  const [bundleDiscount, setBundleDiscount] =
    useState<number>(0);

  const [isCartOpen, setIsCartOpen] =
    useState<boolean>(false);

  // ============================================
  // CHECKOUT STATE
  // ============================================

  const [activeOrder, setActiveOrder] =
    useState<Order | null>(null);

  const [isRazorpayOpen, setIsRazorpayOpen] =
    useState<boolean>(false);

  const [completedOrder, setCompletedOrder] =
    useState<Order | null>(null);

  const [
    isSuccessModalOpen,
    setIsSuccessModalOpen,
  ] = useState<boolean>(false);

  // ============================================
  // THEME
  // ============================================

  useEffect(() => {
    const root =
      document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((previous) =>
      previous === "dark"
        ? "light"
        : "dark"
    );
  };

  // ============================================
  // ADD TO CART
  // ============================================

  const handleAddToCart = (
    product: Product,
    size?: string,
    color?: string
  ) => {
    setCartItems((previousItems) => {
      const existingIndex =
        previousItems.findIndex(
          (item) =>
            item.product_id === product.id &&
            item.size === size &&
            item.color === color
        );

      // Existing item → increase quantity.
      if (existingIndex !== -1) {
        const updatedItems = [
          ...previousItems,
        ];

        const existingItem =
          updatedItems[existingIndex];

        const nextQuantity =
          existingItem.quantity + 1;

        // Prevent adding beyond available stock.
        if (
          nextQuantity >
          product.stock_quantity
        ) {
          toast.error(
            `Only ${product.stock_quantity} units available`
          );

          return previousItems;
        }

        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: nextQuantity,
        };

        return updatedItems;
      }

      // New cart item.
      return [
        ...previousItems,
        {
          product_id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          original_price:
            product.original_price,
          quantity: 1,

          size:
            size ||
            (product.sizes?.length > 0
              ? product.sizes[0]
              : undefined),

          color:
            color ||
            (product.colors?.length > 0
              ? product.colors[0]
              : undefined),

          is_upsell: false,

          image_url: product.image_url,
        },
      ];
    });

    toast.success(
      `Added ${product.name} to cart`
    );
  };

  // ============================================
  // UPDATE CART QUANTITY
  // ============================================

  const handleUpdateQuantity = (
    productId: string,
    delta: number
  ) => {
    setCartItems((previousItems) =>
      previousItems
        .map((item) => {
          if (
            item.product_id !== productId
          ) {
            return item;
          }

          const nextQuantity =
            item.quantity + delta;

          if (nextQuantity <= 0) {
            return null;
          }

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter(
          (item): item is OrderItem =>
            item !== null
        )
    );
  };

  // ============================================
  // REMOVE CART ITEM
  // ============================================

  const handleRemoveItem = (
    productId: string
  ) => {
    setCartItems((previousItems) =>
      previousItems.filter(
        (item) =>
          item.product_id !== productId
      )
    );

    toast.info(
      "Item removed from cart"
    );
  };

  // ============================================
  // CREATE ORDER
  // ============================================

  const createCheckoutOrder = async (
    items: OrderItem[],
    discount: number
  ) => {
    if (items.length === 0) {
      toast.error(
        "Your cart is empty"
      );

      return null;
    }

    const defaultAddress: Address = {
      name: "Aarav Sharma",
      phone: "+91 98765 43210",
      address_line:
        "Flat 402, Greenfield Heights, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
    };

    const orderPayload: OrderCreate = {
      customer_name:
        defaultAddress.name,

      customer_email:
        "aarav.sharma@example.com",

      customer_phone:
        defaultAddress.phone,

      shipping_address:
        defaultAddress,

      items,

      bundle_discount: Math.max(
        0,
        discount
      ),
    };

    try {
      const createdOrder =
        await apiPost<Order>(
          "/orders",
          orderPayload
        );

      return createdOrder;
    } catch (error) {
      console.error(
        "Order creation failed:",
        error
      );

      toast.error(
        "Could not create Razorpay order"
      );

      return null;
    }
  };

  // ============================================
  // BUY NOW
  // ============================================

  const handleInstantBuy = async (
    product: Product,
    size?: string,
    color?: string,
    bundleUpsells: Product[] = []
  ) => {
    if (
      !product.in_stock ||
      product.stock_quantity <= 0
    ) {
      toast.error(
        "This product is currently out of stock"
      );

      return;
    }

    // Primary product.
    const items: OrderItem[] = [
      {
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        original_price:
          product.original_price,
        quantity: 1,

        size:
          size ||
          (product.sizes?.length > 0
            ? product.sizes[0]
            : undefined),

        color:
          color ||
          (product.colors?.length > 0
            ? product.colors[0]
            : undefined),

        is_upsell: false,

        image_url:
          product.image_url,
      },
    ];

    // Add selected AI upsells.
    if (
      bundleUpsells.length > 0
    ) {
      bundleUpsells.forEach(
        (upsell) => {
          if (
            !upsell.in_stock ||
            upsell.stock_quantity <= 0
          ) {
            return;
          }

          items.push({
            product_id: upsell.id,
            name: upsell.name,
            brand: upsell.brand,
            price: upsell.price,
            original_price:
              upsell.original_price,
            quantity: 1,

            size:
              upsell.sizes?.length > 0
                ? upsell.sizes[0]
                : undefined,

            color:
              upsell.colors?.length > 0
                ? upsell.colors[0]
                : undefined,

            is_upsell: true,

            image_url:
              upsell.image_url,
          });
        }
      );
    }

    /*
     * ₹150 discount for each selected AI
     * bundle upsell.
     */
    const upsellDiscount =
      bundleUpsells.length * 150;

    const createdOrder =
      await createCheckoutOrder(
        items,
        upsellDiscount
      );

    if (!createdOrder) {
      return;
    }

    setActiveOrder(
      createdOrder
    );

    setIsRazorpayOpen(true);
  };

  // ============================================
  // PROCEED FROM CART TO RAZORPAY
  // ============================================

  const handleProceedToRazorpay =
    async () => {
      if (cartItems.length === 0) {
        toast.error(
          "Your cart is empty"
        );

        return;
      }

      const createdOrder =
        await createCheckoutOrder(
          cartItems,
          bundleDiscount
        );

      if (!createdOrder) {
        return;
      }

      setIsCartOpen(false);

      setActiveOrder(
        createdOrder
      );

      setIsRazorpayOpen(true);
    };

  // ============================================
  // PAYMENT COMPLETE
  // ============================================

  const handlePaymentComplete = (
    updatedOrder: Order
  ) => {
    /*
     * RazorpayModal has already verified the
     * payment with the backend.
     */

    setIsRazorpayOpen(false);

    setActiveOrder(null);

    setCompletedOrder(
      updatedOrder
    );

    setCartItems([]);

    setBundleDiscount(0);

    setIsSuccessModalOpen(true);

    toast.success(
      "Payment verified successfully"
    );
  };

  // ============================================
  // CART COUNT
  // ============================================

  const totalCartCount =
    cartItems.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-[#FAFAFA]">
      <Toaster
        position="top-right"
        richColors
        theme={theme}
      />

      {/* ======================================== */}
      {/* NAVBAR */}
      {/* ======================================== */}

      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        cartCount={totalCartCount}
        onOpenCart={() =>
          setIsCartOpen(true)
        }
        theme={theme}
        onToggleTheme={
          handleToggleTheme
        }
      />

      {/* ======================================== */}
      {/* MAIN CONTENT */}
      {/* ======================================== */}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
        {/* AI SHOPPING */}

        {currentTab ===
          "shopping_agent" && (
          <div
            data-testid="view-shopping-agent"
          >
            <ChatPanel
              onAddToCart={
                handleAddToCart
              }
              onInstantBuy={
                handleInstantBuy
              }
              onRemoveFromCart={
                handleRemoveItem
              }
            />
          </div>
        )}

        {/* INVENTORY */}

        {currentTab ===
          "inventory_hub" && (
          <div
            data-testid="view-inventory-hub"
          >
            <InventoryManager />
          </div>
        )}

        {/* CAMPAIGN ORCHESTRATOR */}

        {currentTab ===
          "campaign_orchestrator" && (
          <div
            data-testid="view-campaign-orchestrator"
          >
            <CampaignOrchestrator />
          </div>
        )}

        {/* AUDIT LEDGER */}

        {currentTab ===
          "audit_ledger" && (
          <div
            data-testid="view-audit-ledger"
          >
            <AuditLedger />
          </div>
        )}
      </main>

      {/* ======================================== */}
      {/* CART DRAWER */}
      {/* ======================================== */}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() =>
          setIsCartOpen(false)
        }
        items={cartItems}
        bundleDiscount={
          bundleDiscount
        }
        onUpdateQuantity={
          handleUpdateQuantity
        }
        onRemoveItem={
          handleRemoveItem
        }
        onProceedToRazorpay={
          handleProceedToRazorpay
        }
      />

      {/* ======================================== */}
      {/* RAZORPAY CHECKOUT */}
      {/* ======================================== */}

      <RazorpayModal
        isOpen={isRazorpayOpen}
        onClose={() =>
          setIsRazorpayOpen(false)
        }
        order={activeOrder}
        onPaymentComplete={
          handlePaymentComplete
        }
      />

      {/* ======================================== */}
      {/* SUCCESS MODAL */}
      {/* ======================================== */}

      <OrderSuccessModal
        isOpen={
          isSuccessModalOpen
        }
        onClose={() =>
          setIsSuccessModalOpen(
            false
          )
        }
        order={completedOrder}
        onViewAuditLedger={() => {
          setIsSuccessModalOpen(
            false
          );

          setCurrentTab(
            "audit_ledger"
          );
        }}
      />

      {/* ======================================== */}
      {/* FOOTER */}
      {/* ======================================== */}

      <footer className="border-t border-zinc-900 bg-zinc-950 px-4 py-4 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span>
            Nexus AI Autonomous Commerce
            Platform • Indian Retail Standard
            (INR ₹)
          </span>

          <span className="font-mono text-[11px] text-zinc-400">
            Pipeline: User → AI Agent →
            Merchant Catalog → Razorpay
          </span>
        </div>
      </footer>
    </div>
  );
}