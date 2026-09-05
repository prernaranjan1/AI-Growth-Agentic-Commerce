import React from "react";

import {
  Bot,
  Package,
  Sparkles,
  FileText,
  ShoppingCart,
  Sun,
  Moon,
} from "lucide-react";

export type TabView =
  | "shopping_agent"
  | "inventory_hub"
  | "campaign_orchestrator"
  | "audit_ledger";

interface NavbarProps {
  currentTab: TabView;
  onSelectTab: (tab: TabView) => void;

  cartCount: number;
  onOpenCart: () => void;

  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  cartCount,
  onOpenCart,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* ====================================== */}
        {/* LOGO + AGENT STATUS */}
        {/* ====================================== */}

        <button
          type="button"
          onClick={() =>
            onSelectTab("shopping_agent")
          }
          className="flex min-w-0 shrink-0 cursor-pointer items-center gap-3 text-left"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-zinc-950">
              <Bot className="h-5 w-5 text-blue-400" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-extrabold tracking-tight text-white lg:text-xl">
                NEXUS{" "}
                <span className="text-blue-500">
                  COMMERCE
                </span>
              </span>

              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />

                AI Agent Active
              </span>
            </div>

            <p className="hidden text-xs text-zinc-400 sm:block">
              User → AI Agent → Merchant Catalog →
              Razorpay
            </p>
          </div>
        </button>

        {/* ====================================== */}
        {/* VIEW SWITCHER */}
        {/* ====================================== */}

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/90 p-1 md:flex"
        >
          {/* AI SHOPPING */}

          <button
            type="button"
            data-testid="tab-shopping-agent"
            onClick={() =>
              onSelectTab("shopping_agent")
            }
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              currentTab === "shopping_agent"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <Bot className="h-4 w-4" />

            <span>
              AI Shopping
            </span>
          </button>

          {/* INVENTORY */}

          <button
            type="button"
            data-testid="tab-inventory-hub"
            onClick={() =>
              onSelectTab("inventory_hub")
            }
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              currentTab === "inventory_hub"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <Package className="h-4 w-4" />

            <span>
              Merchant Inventory
            </span>
          </button>

          {/* CAMPAIGN */}

          <button
            type="button"
            data-testid="tab-campaign-orchestrator"
            onClick={() =>
              onSelectTab(
                "campaign_orchestrator"
              )
            }
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              currentTab ===
              "campaign_orchestrator"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="h-4 w-4" />

            <span>
              Campaign Orchestrator
            </span>

            <span className="hidden rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 lg:inline-block">
              AI
            </span>
          </button>

          {/* AUDIT */}

          <button
            type="button"
            data-testid="tab-audit-ledger"
            onClick={() =>
              onSelectTab("audit_ledger")
            }
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
              currentTab === "audit_ledger"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <FileText className="h-4 w-4" />

            <span>
              Audit Ledger
            </span>
          </button>
        </nav>

        {/* ====================================== */}
        {/* RIGHT ACTIONS */}
        {/* ====================================== */}

        <div className="flex shrink-0 items-center gap-2">
          {/* CART */}

          <button
            type="button"
            data-testid="navbar-cart-button"
            onClick={onOpenCart}
            className="relative flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 transition-all hover:border-blue-500/50 hover:bg-zinc-800 sm:text-sm"
          >
            <ShoppingCart className="h-4 w-4 text-blue-400" />

            <span className="hidden font-medium sm:inline">
              Cart
            </span>

            {cartCount > 0 && (
              <span
                data-testid="cart-badge-count"
                className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white"
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* THEME TOGGLE */}

          <button
            type="button"
            data-testid="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${
              theme === "dark"
                ? "Light"
                : "Dark"
            } Mode`}
            aria-label={`Switch to ${
              theme === "dark"
                ? "Light"
                : "Dark"
            } Mode`}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* ======================================== */}
      {/* MOBILE NAVIGATION */}
      {/* ======================================== */}

      <div className="border-t border-zinc-800/60 px-4 py-2 md:hidden">
        <nav
          aria-label="Mobile navigation"
          className="flex gap-1 overflow-x-auto"
        >
          <button
            type="button"
            data-testid="mobile-tab-shopping-agent"
            onClick={() =>
              onSelectTab("shopping_agent")
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              currentTab === "shopping_agent"
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />

            AI Shopping
          </button>

          <button
            type="button"
            data-testid="mobile-tab-inventory-hub"
            onClick={() =>
              onSelectTab("inventory_hub")
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              currentTab === "inventory_hub"
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            <Package className="h-3.5 w-3.5" />

            Inventory
          </button>

          <button
            type="button"
            data-testid="mobile-tab-campaign-orchestrator"
            onClick={() =>
              onSelectTab(
                "campaign_orchestrator"
              )
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              currentTab ===
              "campaign_orchestrator"
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />

            Campaigns
          </button>

          <button
            type="button"
            data-testid="mobile-tab-audit-ledger"
            onClick={() =>
              onSelectTab("audit_ledger")
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              currentTab === "audit_ledger"
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />

            Audit
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;