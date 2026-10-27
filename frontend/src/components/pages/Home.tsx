import React, { useEffect, useState } from "react";

import {
  Navbar,
  type TabView,
} from "@/components/Navbar";

import { ChatPanel } from "@/components/AIChat/ChatPanel";

import { InventoryManager } from "@/components/Merchant/InventoryManager";

import { CampaignOrchestrator } from "@/components/Merchant/CampaignOrchestrator";

import { AuditLedger } from "@/components/Audit/AuditLedger";

import { MerchantKeyGate } from "@/components/Merchant/MerchantKeyGate";

import RazorpayModal from "@/components/Checkout/RazorpayModal";

import OrderSuccessModal from "@/components/Checkout/OrderSuccessModal";

import CartDrawer from "@/components/Checkout/CartDrawer";

import type {
  Product,
  CartLine,
  Order,
} from "@/types";

// Per-line cap; the server also caps a whole order at 20 units.
const MAX_QTY_PER_LINE = 10;

import { Toaster, toast } from "sonner";

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
    useState<CartLine[]>([]);

  // Links checkout to the chat that produced it.
  const [chatSessionId, setChatSessionId] =
    useState<string | undefined>(undefined);

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
  //
  // Cart lines carry display prices for the drawer only.
  // The server re-prices every line at checkout.
  // ============================================

  const toCartLine = (
    product: Product,
    isUpsell: boolean,
    size?: string,
    color?: string
  ): CartLine => {
    const chosenSize =
      size ||
      (product.sizes?.length > 0
        ? product.sizes[0]
        : undefined);

    const chosenColor =
      color ||
      (product.colors?.length > 0
        ? product.colors[0]
        : undefined);

    return {
    line_id: [
      product.id,
      chosenSize ?? "",
      chosenColor ?? "",
      isUpsell ? "bundle" : "item",
    ].join("|"),
    product_id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    original_price: product.original_price,
    quantity: 1,
    size: chosenSize,
    color: chosenColor,
    is_upsell: isUpsell,
    image_url: product.image_url,
    };
  };

  const addLine = (
    product: Product,
    options: {
      size?: string;
      color?: string;
      isUpsell?: boolean;
      incrementIfPresent?: boolean;
    } = {}
  ) => {
    const line = toCartLine(
      product,
      options.isUpsell ?? false,
      options.size,
      options.color
    );

    setCartItems((previousItems) => {
      const existingIndex =
        previousItems.findIndex(
          (item) => item.line_id === line.line_id
        );

      if (existingIndex === -1) {
        return [...previousItems, line];
      }

      if (!options.incrementIfPresent) {
        return previousItems;
      }

      const existingItem =
        previousItems[existingIndex];

      const limit = Math.min(
        MAX_QTY_PER_LINE,
        product.stock_quantity
      );

      if (existingItem.quantity + 1 > limit) {
        toast.error(
          `You can add up to ${limit} of this item`
        );
        return previousItems;
      }

      const updatedItems = [...previousItems];

      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + 1,
      };

      return updatedItems;
    });
  };

  const handleAddToCart = (
    product: Product,
    size?: string,
    color?: string,
    isUpsell = false
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

    addLine(product, {
      size,
      color,
      isUpsell,
      incrementIfPresent: true,
    });

    if (!isUpsell) {
      toast.success(
        `Added ${product.name} to cart`
      );
    }
  };

  // ============================================
  // UPDATE CART QUANTITY
  // ============================================

  const handleUpdateQuantity = (
    lineId: string,
    delta: number
  ) => {
    setCartItems((previousItems) =>
      previousItems
        .map((item) => {
          if (item.line_id !== lineId) {
            return item;
          }

          const nextQuantity = Math.min(
            MAX_QTY_PER_LINE,
            item.quantity + delta
          );

          if (nextQuantity <= 0) {
            return null;
          }

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter(
          (item): item is CartLine =>
            item !== null
        )
    );
  };

  // ============================================
  // REMOVE CART ITEM
  // ============================================

  const handleRemoveLine = (lineId: string) => {
    setCartItems((previousItems) =>
      previousItems.filter(
        (item) => item.line_id !== lineId
      )
    );

    toast.info("Item removed from cart");
  };

  // The chat un-selects a bundle item by product.
  const handleRemoveBundleItem = (
    productId: string
  ) => {
    setCartItems((previousItems) =>
      previousItems.filter(
        (item) =>
          !(
            item.product_id === productId &&
            item.is_upsell
          )
      )
    );
  };

  // ============================================
  // BUY NOW
  //
  // Puts the product (and any bundle items picked in chat)
  // in the cart and opens checkout, where the customer
  // enters their own delivery details.
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

    addLine(product, { size, color });

    bundleUpsells
      .filter(
        (upsell) =>
          upsell.in_stock &&
          upsell.stock_quantity > 0
      )
      .forEach((upsell) =>
        addLine(upsell, { isUpsell: true })
      );

    setIsCartOpen(true);
  };

  // ============================================
  // CART DRAWER CREATED THE ORDER → OPEN RAZORPAY
  // ============================================

  const handleProceedToRazorpay = (
    createdOrder: Order
  ) => {
    setIsCartOpen(false);

    setActiveOrder(createdOrder);

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
                handleRemoveBundleItem
              }
              onSessionChange={
                setChatSessionId
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
            <MerchantKeyGate>
              <InventoryManager />
            </MerchantKeyGate>
          </div>
        )}

        {/* CAMPAIGN ORCHESTRATOR */}

        {currentTab ===
          "campaign_orchestrator" && (
          <div
            data-testid="view-campaign-orchestrator"
          >
            <MerchantKeyGate>
              <CampaignOrchestrator />
            </MerchantKeyGate>
          </div>
        )}

        {/* AUDIT LEDGER */}

        {currentTab ===
          "audit_ledger" && (
          <div
            data-testid="view-audit-ledger"
          >
            <MerchantKeyGate>
              <AuditLedger />
            </MerchantKeyGate>
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
        sessionId={chatSessionId}
        onUpdateQuantity={
          handleUpdateQuantity
        }
        onRemoveItem={
          handleRemoveLine
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