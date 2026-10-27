import React, { useState } from "react";
import {
  Star,
  Check,
  Zap,
  ShoppingBag,
} from "lucide-react";

import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;

  onAddToCart: (
    product: Product,
    size?: string,
    color?: string
  ) => void;

  onInstantBuy?: (
    product: Product,
    size?: string,
    color?: string
  ) => void;

  isPrimary?: boolean;
}

export const ProductCard: React.FC<
  ProductCardProps
> = ({
  product,
  onAddToCart,
  onInstantBuy,
  isPrimary = false,
}) => {
  /*
   * Default size and color.
   */
  const [selectedSize, setSelectedSize] =
    useState<string>(
      product.sizes?.length > 0
        ? product.sizes[0]
        : ""
    );

  const [selectedColor, setSelectedColor] =
    useState<string>(
      product.colors?.length > 0
        ? product.colors[0]
        : ""
    );

  const [added, setAdded] =
    useState<boolean>(false);

  /*
   * Add product to cart.
   */
  const handleAdd = () => {
    onAddToCart(
      product,
      selectedSize || undefined,
      selectedColor || undefined
    );

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 2000);
  };

  /*
   * Buy Now.
   *
   * The parent is responsible for:
   * 1. Creating the order
   * 2. Opening RazorpayModal
   * 3. Verifying the Razorpay payment
   */
  const handleBuyNow = () => {
    if (!onInstantBuy) {
      return;
    }

    onInstantBuy(
      product,
      selectedSize || undefined,
      selectedColor || undefined
    );
  };

  /*
   * Discount amount.
   */
  const savings = Math.max(
    0,
    product.original_price - product.price
  );

  /*
   * Don't show Buy Now if product is unavailable.
   */
  const canBuy =
    product.in_stock &&
    product.stock_quantity > 0;

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
        isPrimary
          ? "border-blue-500/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/20"
          : "border-zinc-800/80 bg-zinc-900/80 shadow-md hover:border-zinc-700 hover:bg-zinc-900"
      }`}
    >
      {/* ======================================== */}
      {/* AI PRIMARY RECOMMENDATION BANNER */}
      {/* ======================================== */}

      {isPrimary && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 px-4 py-1.5 text-xs font-semibold tracking-wide text-white">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 fill-current text-amber-300" />

            <span>
              AI TOP RECOMMENDATION (BEST FIT)
            </span>
          </div>

          <span className="rounded-full bg-white/20 px-2 py-0.5 font-mono text-[11px]">
            ₹
            {product.price.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>
      )}

      {/* ======================================== */}
      {/* PRODUCT IMAGE */}
      {/* ======================================== */}

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950 sm:aspect-[16/9]">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />

        {/* Brand + discount */}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-md border border-zinc-700/60 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-bold text-zinc-100 shadow backdrop-blur-md">
            {product.brand}
          </span>

          {product.discount_percent > 0 && (
            <span className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-bold text-zinc-950 shadow">
              {product.discount_percent}% OFF
            </span>
          )}
        </div>

        {/* Rating + stock */}

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-black/70 px-2 py-1 font-semibold text-amber-400 backdrop-blur-md">
            <Star className="h-3.5 w-3.5 fill-amber-400" />

            <span>
              {product.rating.toFixed(1)}
            </span>

            <span className="text-[10px] text-zinc-400">
              ({product.reviews_count})
            </span>
          </div>

          <span
            data-testid={`stock-status-${product.id}`}
            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium backdrop-blur-md ${
              product.stock_quantity <= 5
                ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {product.stock_quantity <= 0
              ? "Out of Stock"
              : product.stock_quantity <= 5
                ? `Only ${product.stock_quantity} Left`
                : `${product.stock_quantity} In Stock`}
          </span>
        </div>
      </div>

      {/* ======================================== */}
      {/* PRODUCT CONTENT */}
      {/* ======================================== */}

      <div className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
        <div>
          {/* Product name */}

          <h4 className="text-base font-bold leading-snug tracking-tight text-zinc-100 transition-colors group-hover:text-blue-400 sm:text-lg">
            {product.name}
          </h4>

          {/* Description */}

          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
            {product.description}
          </p>

          {/* ==================================== */}
          {/* PRICING */}
          {/* ==================================== */}

          <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
            <span
              data-testid={`product-price-${product.id}`}
              className="font-heading text-xl font-black tracking-tight text-white sm:text-2xl"
            >
              ₹
              {product.price.toLocaleString(
                "en-IN"
              )}
            </span>

            {product.original_price >
              product.price && (
              <span className="text-xs text-zinc-500 line-through sm:text-sm">
                ₹
                {product.original_price.toLocaleString(
                  "en-IN"
                )}
              </span>
            )}

            {savings > 0 && (
              <span className="text-xs font-semibold text-emerald-400">
                Save ₹
                {savings.toLocaleString(
                  "en-IN"
                )}
              </span>
            )}
          </div>

          {/* ==================================== */}
          {/* FEATURES */}
          {/* ==================================== */}

          {product.features &&
            product.features.length > 0 && (
              <div className="mt-3 space-y-1">
                {product.features
                  .slice(0, 3)
                  .map((feature, index) => (
                    <div
                      key={`${product.id}-feature-${index}`}
                      className="flex items-center gap-1.5 text-xs text-zinc-300"
                    >
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />

                      <span className="truncate">
                        {feature}
                      </span>
                    </div>
                  ))}
              </div>
            )}

          {/* ==================================== */}
          {/* SIZE SELECTOR */}
          {/* ==================================== */}

          {product.sizes &&
            product.sizes.length > 0 && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Select Size:
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      data-testid={`size-opt-${product.id}-${size.replace(
                        /\s+/g,
                        ""
                      )}`}
                      onClick={() =>
                        setSelectedSize(size)
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        selectedSize === size
                          ? "border-blue-500 bg-blue-600 font-bold text-white shadow-sm"
                          : "border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* ==================================== */}
          {/* COLOR SELECTOR */}
          {/* ==================================== */}

          {product.colors &&
            product.colors.length > 0 && (
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Color:{" "}
                  <span className="font-normal text-zinc-200">
                    {selectedColor}
                  </span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      data-testid={`color-opt-${product.id}-${color.replace(
                        /\s+/g,
                        ""
                      )}`}
                      onClick={() =>
                        setSelectedColor(color)
                      }
                      className={`rounded-md border px-2 py-0.5 text-[11px] transition-all ${
                        selectedColor === color
                          ? "border-blue-400 bg-zinc-700 font-medium text-white ring-1 ring-blue-400"
                          : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* ======================================== */}
        {/* ACTION BUTTONS */}
        {/* ======================================== */}

        <div className="flex items-center gap-2 border-t border-zinc-800/80 pt-3">
          {/* ADD TO CART */}

          <button
            data-testid={`add-to-cart-${product.id}`}
            type="button"
            onClick={handleAdd}
            disabled={!canBuy}
            className="flex h-9 flex-1 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-xs font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />

                Added!
              </>
            ) : (
              <>
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5 text-blue-400" />

                Add to Cart
              </>
            )}
          </button>

          {/* BUY NOW */}

          <button
            data-testid={`buy-now-${product.id}`}
            type="button"
            onClick={handleBuyNow}
            disabled={!canBuy || !onInstantBuy}
            className="flex h-9 flex-1 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Zap className="mr-1 h-3.5 w-3.5 fill-amber-300 text-amber-300" />

            Buy with Razorpay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;