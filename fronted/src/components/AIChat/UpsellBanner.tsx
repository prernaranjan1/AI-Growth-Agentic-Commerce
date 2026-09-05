import React from "react";

import {
  Sparkles,
  Plus,
  Check,
  ShieldCheck,
  Tag,
} from "lucide-react";

import type { Product } from "@/types";

interface UpsellBannerProps {
  upsellProducts: Product[];
  onAddUpsell: (
    product: Product,
    discount: number
  ) => void;
  selectedUpsellIds: string[];
}

export const UpsellBanner: React.FC<
  UpsellBannerProps
> = ({
  upsellProducts,
  onAddUpsell,
  selectedUpsellIds,
}) => {
  // Don't render anything when there are no
  // recommended cross-sell products.
  if (
    !upsellProducts ||
    upsellProducts.length === 0
  ) {
    return null;
  }

  const bundleDiscount = 150;

  return (
    <div
      data-testid="upsell-container"
      className="relative mt-4 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-zinc-900/90 to-zinc-950 p-4 shadow-xl sm:p-5"
    >
      {/* Background Accent Glow */}

      <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}

      <div className="relative mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10">
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>

          <div>
            <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-zinc-100">
              <span>
                Smart AI Bundle & Cross-Sell
              </span>

              <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                <Tag className="h-3 w-3" />

                SAVE ₹150 INSTANTLY
              </span>
            </h4>

            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Customers who bought these products
              frequently pair them with these
              essentials.
            </p>
          </div>
        </div>

        {/* AI Recommendation Badge */}

        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />

          AI Recommended
        </div>
      </div>

      {/* ====================================== */}
      {/* UPSELL PRODUCTS */}
      {/* ====================================== */}

      <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
        {upsellProducts.map((item) => {
          const isAdded =
            selectedUpsellIds.includes(
              item.id
            );

          return (
            <div
              key={item.id}
              data-testid={`upsell-card-${item.id}`}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                isAdded
                  ? "border-blue-500/50 bg-blue-950/40 ring-1 ring-blue-500/30"
                  : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              {/* ================================= */}
              {/* PRODUCT IMAGE */}
              {/* ================================= */}

              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* ================================= */}
              {/* PRODUCT INFO */}
              {/* ================================= */}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {item.brand}
                  </span>
                </div>

                <h5 className="mt-0.5 truncate text-xs font-bold text-zinc-100">
                  {item.name}
                </h5>

                {/* Pricing */}

                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-amber-400">
                    ₹
                    {item.price.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  {item.original_price >
                    item.price && (
                    <span className="text-[11px] text-zinc-500 line-through">
                      ₹
                      {item.original_price.toLocaleString(
                        "en-IN"
                      )}
                    </span>
                  )}

                  {item.discount_percent >
                    0 && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      {item.discount_percent}%
                      off
                    </span>
                  )}
                </div>

                {/* Bundle saving */}

                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Extra ₹
                  {bundleDiscount.toLocaleString(
                    "en-IN"
                  )}{" "}
                  bundle discount
                </div>
              </div>

              {/* ================================= */}
              {/* ADD / REMOVE BUNDLE */}
              {/* ================================= */}

              <button
                type="button"
                data-testid={`upsell-add-btn-${item.id}`}
                onClick={() =>
                  onAddUpsell(
                    item,
                    bundleDiscount
                  )
                }
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all ${
                  isAdded
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />

                    <span>
                      Added
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 text-amber-400" />

                    <span>
                      Add Bundle
                    </span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ====================================== */}
      {/* FOOTER */}
      {/* ====================================== */}

      <div className="relative mt-3 flex items-center gap-1.5 border-t border-zinc-800/80 pt-3 text-[10px] text-zinc-500">
        <Sparkles className="h-3 w-3 text-indigo-400" />

        <span>
          AI cross-sell selected from merchant
          catalog purchase patterns.
        </span>
      </div>
    </div>
  );
};

export default UpsellBanner;