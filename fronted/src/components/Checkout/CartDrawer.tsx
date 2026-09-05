import React, { useState } from "react";
import {
  X,
  Trash2,
  ShoppingBag,
  MapPin,
  Zap,
  Plus,
  Minus,
} from "lucide-react";

import type {
  OrderItem,
  Address,
  OrderCreate,
  Order,
} from "@/types";

import { apiPost } from "@/lib/api";
import { toast } from "sonner";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  bundleDiscount: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToRazorpay: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  bundleDiscount,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToRazorpay,
}) => {
  const [customerName, setCustomerName] = useState("Aarav Sharma");
  const [customerEmail, setCustomerEmail] = useState(
    "aarav.sharma@example.com"
  );
  const [customerPhone, setCustomerPhone] = useState(
    "+91 98765 43210"
  );
  const [addressLine, setAddressLine] = useState(
    "Flat 402, Greenfield Heights, Indiranagar"
  );
  const [city, setCity] = useState("Bengaluru");
  const [state, setState] = useState("Karnataka");
  const [pincode, setPincode] = useState("560038");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * Calculate cart totals.
   */
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const safeBundleDiscount = Math.min(
    Math.max(bundleDiscount, 0),
    subtotal
  );

  const totalAmount = Math.max(
    0,
    subtotal - safeBundleDiscount
  );

  /*
   * Create local order + Razorpay order on backend.
   */
  const handleCheckout = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    /*
     * Basic validation.
     */
    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerPhone.trim() ||
      !addressLine.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      toast.error(
        "Please fill in all delivery details."
      );
      return;
    }

    /*
     * Basic pincode validation.
     */
    if (!/^\d{6}$/.test(pincode.trim())) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }

    /*
     * Basic email validation.
     */
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail.trim()
      )
    ) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const shippingAddress: Address = {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address_line: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      };

      const payload: OrderCreate = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress,
        items,
        bundle_discount: safeBundleDiscount,
      };

      /*
       * Backend:
       *
       * POST /api/orders
       *
       * The backend creates the Razorpay Order and
       * returns razorpay_order_id.
       */
      const createdOrder = await apiPost<Order>(
        "/orders",
        payload
      );

      toast.success("Order created. Opening Razorpay...");

      /*
       * Send the created order to the parent.
       * The parent should open RazorpayModal.
       */
      onProceedToRazorpay(createdOrder);
    } catch (error) {
      console.error(
        "Order creation failed:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Could not create order. Please try again.";

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * Don't render drawer when closed.
   *
   * IMPORTANT:
   * Hooks are above this return.
   */
  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="cart-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <div
        data-testid="cart-drawer-container"
        className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* ========================================= */}
        {/* HEADER */}
        {/* ========================================= */}

        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20">
              <ShoppingBag className="h-4 w-4 text-blue-400" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Your Shopping Cart
              </h3>

              <p className="text-[11px] text-zinc-400">
                {items.length} item(s) selected
              </p>
            </div>
          </div>

          <button
            data-testid="close-cart-btn"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close shopping cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ========================================= */}
        {/* CONTENT */}
        {/* ========================================= */}

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {/* Empty cart */}

          {items.length === 0 ? (
            <div
              data-testid="cart-empty-state"
              className="space-y-3 py-12 text-center"
            >
              <ShoppingBag className="mx-auto h-12 w-12 text-zinc-600" />

              <div className="font-bold text-zinc-300">
                Your cart is empty
              </div>

              <p className="mx-auto max-w-xs text-xs text-zinc-500">
                Ask the AI Shopping Agent for recommendations
                such as "Running shoes under ₹3,000" to add
                items.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Cart Items
              </h4>

              {items.map((item) => (
                <div
                  key={item.product_id}
                  data-testid={`cart-item-${item.product_id}`}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900 p-3"
                >
                  {/* Product image */}

                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-14 w-14 shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 object-cover"
                    />
                  )}

                  {/* Product information */}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase text-zinc-400">
                        {item.brand}
                      </span>

                      {item.is_upsell && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                          Bundle
                        </span>
                      )}
                    </div>

                    <h5 className="mt-0.5 truncate text-xs font-bold text-zinc-100">
                      {item.name}
                    </h5>

                    {item.size && (
                      <span className="block text-[11px] text-zinc-400">
                        Size: {item.size}
                      </span>
                    )}

                    {item.color && (
                      <span className="block text-[11px] text-zinc-400">
                        Color: {item.color}
                      </span>
                    )}

                    <div className="mt-1 font-mono text-xs font-bold text-blue-400">
                      ₹
                      {item.price.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  {/* Quantity / remove */}

                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      data-testid={`cart-remove-${item.product_id}`}
                      type="button"
                      onClick={() =>
                        onRemoveItem(item.product_id)
                      }
                      className="p-1 text-zinc-500 transition-colors hover:text-red-400"
                      title="Remove item"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.product_id,
                            -1
                          )
                        }
                        disabled={item.quantity <= 1}
                        className="p-0.5 text-zinc-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="px-1 font-mono text-xs font-bold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(
                            item.product_id,
                            1
                          )
                        }
                        className="p-0.5 text-zinc-300 hover:text-white"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================= */}
          {/* DELIVERY FORM */}
          {/* ========================================= */}

          {items.length > 0 && (
            <form
              id="checkout-form"
              onSubmit={handleCheckout}
              className="space-y-3 border-t border-zinc-800 pt-2"
            >
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />

                <span>Delivery Details</span>
              </h4>

              {/* Name */}

              <div>
                <label
                  htmlFor="checkout-name"
                  className="mb-1 block text-[11px] text-zinc-400"
                >
                  Full Name
                </label>

                <input
                  id="checkout-name"
                  data-testid="checkout-name-input"
                  type="text"
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(event.target.value)
                  }
                  className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 outline-none transition focus:border-blue-500"
                />
              </div>

              {/* Email */}

              <div>
                <label
                  htmlFor="checkout-email"
                  className="mb-1 block text-[11px] text-zinc-400"
                >
                  Email
                </label>

                <input
                  id="checkout-email"
                  data-testid="checkout-email-input"
                  type="email"
                  value={customerEmail}
                  onChange={(event) =>
                    setCustomerEmail(event.target.value)
                  }
                  className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 outline-none transition focus:border-blue-500"
                />
              </div>

              {/* Phone */}

              <div>
                <label
                  htmlFor="checkout-phone"
                  className="mb-1 block text-[11px] text-zinc-400"
                >
                  Phone
                </label>

                <input
                  id="checkout-phone"
                  data-testid="checkout-phone-input"
                  type="tel"
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(event.target.value)
                  }
                  className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 outline-none transition focus:border-blue-500"
                />
              </div>

              {/* Address */}

              <div>
                <label
                  htmlFor="checkout-address"
                  className="mb-1 block text-[11px] text-zinc-400"
                >
                  Address Line
                </label>

                <input
                  id="checkout-address"
                  data-testid="checkout-address-input"
                  type="text"
                  value={addressLine}
                  onChange={(event) =>
                    setAddressLine(event.target.value)
                  }
                  className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-100 outline-none transition focus:border-blue-500"
                />
              </div>

              {/* City / State / Pincode */}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor="checkout-city"
                    className="mb-1 block text-[11px] text-zinc-400"
                  >
                    City
                  </label>

                  <input
                    id="checkout-city"
                    data-testid="checkout-city-input"
                    type="text"
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout-state"
                    className="mb-1 block text-[11px] text-zinc-400"
                  >
                    State
                  </label>

                  <input
                    id="checkout-state"
                    data-testid="checkout-state-input"
                    type="text"
                    value={state}
                    onChange={(event) =>
                      setState(event.target.value)
                    }
                    className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout-pincode"
                    className="mb-1 block text-[11px] text-zinc-400"
                  >
                    Pincode
                  </label>

                  <input
                    id="checkout-pincode"
                    data-testid="checkout-pincode-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pincode}
                    onChange={(event) =>
                      setPincode(
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                    className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 font-mono text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ========================================= */}
        {/* FOOTER */}
        {/* ========================================= */}

        {items.length > 0 && (
          <div className="space-y-3 border-t border-zinc-800 bg-zinc-900/95 p-4 sm:p-5">
            {/* Price Breakdown */}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Items Subtotal:</span>

                <span className="font-mono">
                  ₹
                  {subtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {safeBundleDiscount > 0 && (
                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>AI Bundle Savings:</span>

                  <span className="font-mono">
                    -₹
                    {safeBundleDiscount.toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm font-bold text-white">
                <span>Total:</span>

                <span className="font-mono text-blue-400">
                  ₹
                  {totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Razorpay button */}

            <button
              data-testid="proceed-to-razorpay-btn"
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.25"
                    />

                    <path
                      d="M21 12a9 9 0 0 1-9 9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  Creating Order...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />

                  <span>
                    Proceed to Razorpay (₹
                    {totalAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    )
                  </span>
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-zinc-500">
              You will be redirected to Razorpay Test Checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;