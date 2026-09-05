import React from "react";
import {
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Printer,
} from "lucide-react";

import type { Order } from "@/types";

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onViewAuditLedger: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  order,
  onViewAuditLedger,
}) => {
  if (!isOpen || !order) {
    return null;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      data-testid="order-success-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
    >
      <div
        data-testid="order-success-container"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950 text-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-success-title"
      >
        {/* ========================= */}
        {/* TOP SUCCESS HEADER */}
        {/* ========================= */}

        <div className="relative border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-zinc-950 p-6 text-center">
          <button
            data-testid="success-modal-close-btn"
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-zinc-900 p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close order confirmation"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto mb-3 flex h-16 w-16 animate-bounce items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/20 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>

          <h3
            id="order-success-title"
            className="font-heading text-xl font-black text-white sm:text-2xl"
          >
            Order Confirmed &amp; Paid!
          </h3>

          <p className="mt-1 text-xs text-emerald-300/90">
            Razorpay payment verified &amp; inventory successfully allocated
            in warehouse.
          </p>
        </div>

        {/* ========================= */}
        {/* ORDER META */}
        {/* ========================= */}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-900/90 px-6 py-3 text-xs">
          <div>
            <span className="block text-[10px] text-zinc-500">
              ORDER ID
            </span>

            <span
              data-testid="success-order-id"
              className="font-mono font-bold text-white"
            >
              {order.id}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-zinc-500">
              RAZORPAY PAYMENT ID
            </span>

            <span
              data-testid="success-payment-id"
              className="font-mono font-bold text-emerald-400"
            >
              {order.razorpay_payment_id || "N/A"}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-zinc-500">
              PAYMENT METHOD
            </span>

            <span className="font-semibold uppercase text-blue-400">
              {order.payment_method || "UPI"}
            </span>
          </div>
        </div>

        {/* ========================= */}
        {/* MODAL BODY */}
        {/* ========================= */}

        <div className="max-h-[50vh] space-y-4 overflow-y-auto p-6 text-xs">
          {/* Purchased Items */}

          <div>
            <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
              Purchased Items ({order.items.length})
            </h5>

            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={`${item.product_id}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-10 w-10 shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 object-cover"
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 font-bold text-zinc-100">
                        <span>{item.name}</span>

                        {item.is_upsell && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-300">
                            Bundle Upsell
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-400">
                        {item.brand} • Qty: {item.quantity}
                        {item.size ? ` • ${item.size}` : ""}
                        {item.color ? ` • ${item.color}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="ml-3 shrink-0 text-right">
                    <span className="font-mono text-sm font-bold text-white">
                      ₹
                      {(item.price * item.quantity).toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================= */}
          {/* PRICE BREAKDOWN */}
          {/* ========================= */}

          <div className="space-y-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>

              <span className="font-mono">
                ₹
                {order.subtotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {order.bundle_discount > 0 && (
              <div className="flex justify-between font-semibold text-emerald-400">
                <span>AI Bundle Discount:</span>

                <span className="font-mono">
                  -₹
                  {order.bundle_discount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-zinc-400">
              <span>GST / Taxes:</span>

              <span className="font-mono">
                ₹
                {order.tax.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="flex justify-between border-t border-zinc-800 pt-2 text-sm font-black text-white">
              <span>Total Paid:</span>

              <span
                data-testid="success-total-amount"
                className="font-mono text-base text-emerald-400"
              >
                ₹
                {order.total_amount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* ========================= */}
          {/* SHIPPING DETAILS */}
          {/* ========================= */}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
            <h5 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
              Delivery Destination
            </h5>

            <div className="leading-relaxed text-zinc-300">
              <span className="font-semibold text-white">
                {order.customer_name}
              </span>{" "}
              ({order.customer_phone})
              <br />

              {order.shipping_address.address_line},{" "}
              {order.shipping_address.city},{" "}
              {order.shipping_address.state} -{" "}
              {order.shipping_address.pincode}
            </div>
          </div>

          {/* ========================= */}
          {/* AI DECISION SNAPSHOT */}
          {/* ========================= */}

          {order.agent_thought_snapshot && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3.5 text-blue-200">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase text-blue-300">
                <Sparkles className="h-3.5 w-3.5" />

                <span>Agent Decision Audit Summary</span>
              </div>

              <p className="text-[11px] leading-relaxed text-zinc-300">
                {order.agent_thought_snapshot.intent_summary} →{" "}
                {order.agent_thought_snapshot.recommendation_rationale}
              </p>
            </div>
          )}
        </div>

        {/* ========================= */}
        {/* MODAL ACTIONS */}
        {/* ========================= */}

        <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900/90 p-4">
          <button
            data-testid="print-receipt-btn"
            type="button"
            onClick={handlePrint}
            className="flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Printer className="mr-1.5 h-4 w-4" />

            Print Receipt
          </button>

          <button
            data-testid="view-audit-ledger-btn"
            type="button"
            onClick={() => {
              onClose();
              onViewAuditLedger();
            }}
            className="flex h-10 flex-1 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-colors hover:bg-blue-500"
          >
            <span>View in Audit Ledger</span>

            <ArrowRight className="ml-1.5 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessModal;