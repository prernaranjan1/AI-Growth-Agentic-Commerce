import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  WalletCards,
  Lock,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import type { Order, PaymentVerifyRequest } from "@/types";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPaymentComplete: (updatedOrder: Order) => void;
}

const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  /*
   * Load Razorpay Checkout script dynamically.
   *
   * This avoids requiring the script to already exist in index.html.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        setRazorpayLoaded(true);
      });

      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      setRazorpayLoaded(true);
    };

    script.onerror = () => {
      setRazorpayLoaded(false);

      toast.error("Unable to load Razorpay Checkout.");
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [isOpen]);

  /*
   * Don't render anything when the modal isn't active.
   */
  if (!isOpen || !order) {
    return null;
  }

  /*
   * Convert INR to paise.
   *
   * Example:
   * ₹799 -> 79900 paise
   */
  const amountInPaise = Math.round(order.total_amount * 100);

  /*
   * Open genuine Razorpay Checkout.
   */
  const handleProcessPayment = async () => {
    if (!order) {
      return;
    }

    if (isProcessing) {
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!razorpayKey) {
      toast.error(
        "Razorpay key is missing. Add VITE_RAZORPAY_KEY_ID to frontend .env."
      );
      return;
    }

    if (!order.razorpay_order_id) {
      toast.error(
        "Razorpay order ID is missing. Please create the order again."
      );
      return;
    }

    if (!razorpayLoaded || !window.Razorpay) {
      toast.error("Razorpay Checkout is still loading. Please try again.");
      return;
    }

    try {
      setIsProcessing(true);

      /*
       * These are the exact values returned by Razorpay
       * after a successful payment.
       */
      const handlePaymentSuccess = async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          /*
           * IMPORTANT:
           *
           * Never mark the order paid only on the frontend.
           *
           * Send Razorpay's signature to backend.
           * Backend verifies it using RAZORPAY_KEY_SECRET.
           */
          const verifyPayload: PaymentVerifyRequest = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,

            /*
             * The backend should ideally fetch the payment from
             * Razorpay and determine the actual payment method.
             *
             * Keeping this value for compatibility with the
             * current backend.
             */
            payment_method: "upi",

            payment_details: {
              source: "razorpay_standard_checkout",
              verified_at: new Date().toISOString(),
            },
          };

          const updatedOrder = await apiPost<Order>(
            `/orders/${order.id}/verify-payment`,
            verifyPayload
          );

          toast.success("Payment successful!");

          onPaymentComplete(updatedOrder);
          onClose();
        } catch (error: any) {
          console.error("Payment verification failed:", error);

          toast.error(
            error?.message ||
              "Payment was received but verification failed. Please contact support."
          );
        } finally {
          setIsProcessing(false);
        }
      };

      /*
       * Razorpay Checkout configuration.
       */
      const options = {
        key: razorpayKey,

        /*
         * Amount must be in paise.
         */
        amount: amountInPaise,

        currency: order.currency || "INR",

        name: "Nexus AI Commerce",

        description: `Payment for ${order.id}`,

        order_id: order.razorpay_order_id,

        prefill: {
          name: order.customer_name,
          email: order.customer_email,
          contact: order.customer_phone,
        },

        notes: {
          internal_order_id: order.id,
        },

        theme: {
          color: "#0284C7",
        },

        /*
         * Razorpay calls this after successful authorization.
         */
        handler: handlePaymentSuccess,

        /*
         * Called when user closes Razorpay Checkout.
         */
        modal: {
          ondismiss: () => {
            setIsProcessing(false);

            toast.info("Payment cancelled.");
          },

          escape: true,

          confirm_close: true,
        },
      };

      /*
       * Create Razorpay instance.
       */
      const razorpay = new window.Razorpay(options);

      /*
       * Handle failed payments.
       */
      razorpay.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response);

        const description =
          response?.error?.description || "Payment failed.";

        toast.error(description);

        setIsProcessing(false);
      });

      /*
       * Open Razorpay Checkout.
       */
      razorpay.open();
    } catch (error: any) {
      console.error("Razorpay initialization error:", error);

      toast.error(
        error?.message || "Unable to start Razorpay Checkout."
      );

      setIsProcessing(false);
    }
  };

  return (
    <div
      data-testid="razorpay-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="razorpay-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-950 px-6 py-5 text-white">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />

              <h2
                id="razorpay-modal-title"
                className="text-lg font-semibold"
              >
                Secure Checkout
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Powered by Razorpay Test Mode
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-2 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Order summary */}
        <div className="border-b bg-slate-50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Order
              </p>

              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {order.id}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">Amount</p>

              <p className="text-2xl font-bold text-slate-950">
                ₹{order.total_amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer details */}
        <div className="px-6 py-5">
          <div className="rounded-xl border bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              Customer details
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Name</span>

                <span className="font-medium text-slate-900">
                  {order.customer_name}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Email</span>

                <span className="max-w-[250px] truncate font-medium text-slate-900">
                  {order.customer_email}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Phone</span>

                <span className="font-medium text-slate-900">
                  {order.customer_phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment information */}
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-2 shadow-sm">
                <Lock className="h-5 w-5 text-cyan-700" />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  Pay securely with Razorpay
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Razorpay Checkout will securely collect your payment.
                  Available methods may include UPI, cards, netbanking and
                  wallets depending on your Test Mode configuration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Supported methods */}
        <div className="px-6 pb-5">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Payment methods
          </p>

          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col items-center rounded-lg border bg-slate-50 px-2 py-3">
              <Smartphone className="mb-1 h-5 w-5 text-slate-700" />

              <span className="text-xs text-slate-600">UPI</span>
            </div>

            <div className="flex flex-col items-center rounded-lg border bg-slate-50 px-2 py-3">
              <CreditCard className="mb-1 h-5 w-5 text-slate-700" />

              <span className="text-xs text-slate-600">Cards</span>
            </div>

            <div className="flex flex-col items-center rounded-lg border bg-slate-50 px-2 py-3">
              <Building2 className="mb-1 h-5 w-5 text-slate-700" />

              <span className="text-xs text-slate-600">Bank</span>
            </div>

            <div className="flex flex-col items-center rounded-lg border bg-slate-50 px-2 py-3">
              <WalletCards className="mb-1 h-5 w-5 text-slate-700" />

              <span className="text-xs text-slate-600">Wallet</span>
            </div>
          </div>
        </div>

        {/* Footer / Pay button */}
        <div className="border-t bg-white px-6 py-5">
          <button
            data-testid="razorpay-pay-submit-btn"
            type="button"
            className="h-12 w-full bg-slate-950 text-base font-semibold text-white hover:bg-slate-800"
            disabled={isProcessing || !razorpayLoaded}
            onClick={handleProcessPayment}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : !razorpayLoaded ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading Razorpay...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Pay ₹{order.total_amount.toFixed(2)}
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5" />

            <span>Razorpay Test Mode • No real money charged</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RazorpayModal;