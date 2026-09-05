import React, { useState } from "react";
import {
  FileText,
  Search,
  Download,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Activity,
  ShoppingBag,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  AuditEvent,
  AuditMetrics,
  Order,
} from "@/types";

import { apiGet } from "@/lib/api";

export const AuditLedger: React.FC = () => {
  const [selectedEventType, setSelectedEventType] =
    useState<string>("all");

  const [searchQuery, setSearchQuery] =
    useState<string>("");

  const [expandedEventId, setExpandedEventId] =
    useState<string | null>(null);

  // ============================================
  // FETCH AUDIT EVENTS
  // ============================================

  const {
    data: auditEvents = [],
    isLoading: isLoadingEvents,
  } = useQuery<AuditEvent[]>({
    queryKey: [
      "audit-logs",
      selectedEventType,
      searchQuery,
    ],

    queryFn: () => {
      const params = new URLSearchParams();

      if (selectedEventType !== "all") {
        params.set(
          "event_type",
          selectedEventType
        );
      }

      if (searchQuery.trim()) {
        params.set(
          "search",
          searchQuery.trim()
        );
      }

      const queryString = params.toString();

      const url = queryString
        ? `/audit/logs?${queryString}`
        : "/audit/logs";

      return apiGet<AuditEvent[]>(url);
    },
  });

  // ============================================
  // FETCH ORDERS
  // ============================================

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
  } = useQuery<Order[]>({
    queryKey: ["audit-orders"],

    queryFn: () =>
      apiGet<Order[]>("/orders"),
  });

  // ============================================
  // FETCH AUDIT METRICS
  // ============================================

  const {
    data: metrics,
    isLoading: isLoadingMetrics,
  } = useQuery<AuditMetrics>({
    queryKey: ["audit-metrics"],

    queryFn: () =>
      apiGet<AuditMetrics>("/audit/metrics"),
  });

  // ============================================
  // EXPORT AUDIT DATA
  // ============================================

  const handleExportJSON = () => {
    try {
      const exportData = {
        exported_at: new Date().toISOString(),

        audit_events: auditEvents,

        orders,

        metrics: metrics ?? null,
      };

      const dataStr =
        "data:application/json;charset=utf-8," +
        encodeURIComponent(
          JSON.stringify(
            exportData,
            null,
            2
          )
        );

      const downloadAnchor =
        document.createElement("a");

      downloadAnchor.setAttribute(
        "href",
        dataStr
      );

      downloadAnchor.setAttribute(
        "download",
        `nexus-commerce-audit-ledger-${Date.now()}.json`
      );

      document.body.appendChild(
        downloadAnchor
      );

      downloadAnchor.click();

      downloadAnchor.remove();

      toast.success(
        "Audit ledger exported as JSON"
      );
    } catch (error) {
      console.error(
        "Audit export failed:",
        error
      );

      toast.error(
        "Unable to export audit ledger"
      );
    }
  };

  // ============================================
  // EVENT FILTERS
  // ============================================

  const eventTypes = [
    "all",
    "INTENT_PARSED",
    "CATALOG_SEARCH",
    "INVENTORY_CHECK",
    "RECOMMENDATION_DISPATCHED",
    "UPSELL_TRIGGERED",
    "ORDER_CREATED",
    "PAYMENT_VERIFIED",
    "RAZORPAY_PAYMENT_SUCCESS",
    "CAMPAIGN_AUTO_LAUNCHED",
  ];

  // ============================================
  // LOADING STATE
  // ============================================

  const isLoading =
    isLoadingEvents ||
    isLoadingOrders ||
    isLoadingMetrics;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ======================================== */}
      {/* HEADER */}
      {/* ======================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-2xl font-black text-white">
            <FileText className="h-6 w-6 text-blue-500" />

            <span>
              AI Decision Ledger &amp; Payment Audit
            </span>
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            Immutable trace of user conversational
            queries, catalog searches, stock
            verifications, and Razorpay transactions
          </p>
        </div>

        <button
          data-testid="export-audit-btn"
          type="button"
          onClick={handleExportJSON}
          className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          <Download className="h-4 w-4" />

          <span>
            Export Audit Trail (JSON)
          </span>
        </button>
      </div>

      {/* ======================================== */}
      {/* METRIC CARDS */}
      {/* ======================================== */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* GMV */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Settled GMV</span>

            <CreditCard className="h-4 w-4 text-emerald-400" />
          </div>

          <div
            data-testid="metric-gmv"
            className="mt-2 font-heading text-2xl font-black text-white"
          >
            ₹
            {metrics
              ? metrics.total_gmv.toLocaleString(
                  "en-IN"
                )
              : "0"}
          </div>

          <span className="text-[11px] font-medium text-emerald-400">
            Verified Razorpay Payments
          </span>
        </div>

        {/* ORDERS */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Orders Created</span>

            <ShoppingBag className="h-4 w-4 text-blue-400" />
          </div>

          <div
            data-testid="metric-orders-count"
            className="mt-2 font-heading text-2xl font-black text-white"
          >
            {metrics
              ? metrics.total_orders
              : orders.length}
          </div>

          <span className="text-[11px] text-zinc-400">
            Total transaction records
          </span>
        </div>

        {/* AI LATENCY */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>AI Agent Latency</span>

            <Clock className="h-4 w-4 text-amber-400" />
          </div>

          <div
            data-testid="metric-latency"
            className="mt-2 font-mono text-2xl font-black text-white"
          >
            {metrics
              ? metrics.avg_agent_latency_ms
              : 0}
            ms
          </div>

          <span className="text-[11px] font-medium text-amber-400">
            Average End-to-End
          </span>
        </div>

        {/* PAYMENT SUCCESS */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Payment Success Rate</span>

            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>

          <div
            data-testid="metric-payment-success"
            className="mt-2 font-mono text-2xl font-black text-emerald-400"
          >
            {metrics
              ? metrics.payment_success_rate
              : 0}
            %
          </div>

          <span className="text-[11px] text-zinc-400">
            Razorpay Gateway Test
          </span>
        </div>
      </div>

      {/* ======================================== */}
      {/* TRANSACTIONS */}
      {/* ======================================== */}

      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <CreditCard className="h-4 w-4 text-blue-400" />

            <span>
              Razorpay Financial Transactions (
              {orders.length})
            </span>
          </h3>

          <span className="font-mono text-xs text-zinc-500">
            Real-time transaction feed
          </span>
        </div>

        {isLoadingOrders ? (
          <div className="py-10 text-center text-xs text-zinc-500">
            Loading transactions...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 py-10 text-center text-xs text-zinc-500">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              data-testid="orders-audit-table"
              className="w-full text-left text-xs text-zinc-300"
            >
              <thead className="border-b border-zinc-800 bg-zinc-950/70 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3">
                    Order ID
                  </th>

                  <th className="whitespace-nowrap px-3 py-3">
                    Customer
                  </th>

                  <th className="whitespace-nowrap px-3 py-3">
                    Razorpay ID
                  </th>

                  <th className="px-3 py-3">
                    Items
                  </th>

                  <th className="whitespace-nowrap px-3 py-3">
                    Total Amount
                  </th>

                  <th className="px-3 py-3">
                    Status
                  </th>

                  <th className="px-3 py-3">
                    Method
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {orders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="transition-colors hover:bg-zinc-800/40"
                  >
                    <td className="px-3 py-3 font-mono font-bold text-white">
                      {ord.id}
                    </td>

                    <td className="px-3 py-3 text-zinc-200">
                      {ord.customer_name}
                    </td>

                    <td className="max-w-[180px] truncate px-3 py-3 font-mono text-blue-400">
                      {ord.razorpay_payment_id ||
                        ord.razorpay_order_id ||
                        "N/A"}
                    </td>

                    <td className="max-w-[260px] px-3 py-3 text-zinc-300">
                      {ord.items
                        .map(
                          (item) =>
                            `${item.name} ×${item.quantity}`
                        )
                        .join(", ")}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-white">
                      ₹
                      {ord.total_amount.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          ord.status === "paid"
                            ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                            : ord.status === "failed"
                              ? "border-red-500/30 bg-red-500/20 text-red-300"
                              : "border-amber-500/30 bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>

                    <td className="px-3 py-3 uppercase text-zinc-400">
                      {ord.payment_method || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================== */}
      {/* FILTER + SEARCH */}
      {/* ======================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5">
        {/* Event type filters */}

        <div className="flex flex-wrap items-center gap-1.5">
          {eventTypes.map((type) => (
            <button
              key={type}
              data-testid={`audit-filter-${type}`}
              type="button"
              onClick={() =>
                setSelectedEventType(type)
              }
              className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all ${
                selectedEventType === type
                  ? "bg-blue-600 font-bold text-white"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {type === "all"
                ? "ALL EVENTS"
                : type.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Search */}

        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />

          <input
            data-testid="audit-search-input"
            type="text"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search event title, ID..."
            className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ======================================== */}
      {/* AUDIT EVENT STREAM */}
      {/* ======================================== */}

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <Activity className="h-4 w-4 text-blue-400" />

          <span>
            Real-time Agent Decision Stream (
            {auditEvents.length})
          </span>
        </h3>

        {isLoadingEvents ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-xs text-zinc-500">
            Loading audit events...
          </div>
        ) : auditEvents.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-xs text-zinc-500">
            No events match selected filters.
          </div>
        ) : (
          <div className="space-y-2.5">
            {auditEvents.map((evt) => {
              const isExpanded =
                expandedEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  data-testid={`audit-event-${evt.id}`}
                  className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 font-mono text-xs transition-all hover:border-zinc-700"
                >
                  {/* Event header */}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-sans font-bold text-white">
                        {evt.title}
                      </span>

                      <span className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] text-blue-400">
                        {evt.event_type}
                      </span>

                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                          evt.status === "success"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : evt.status === "error"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>
                        {evt.latency_ms}ms
                      </span>

                      <span>
                        {new Date(
                          evt.created_at
                        ).toLocaleTimeString()}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEventId(
                            isExpanded
                              ? null
                              : evt.id
                          )
                        }
                        className="p-1 text-zinc-400 transition-colors hover:text-white"
                        aria-label={
                          isExpanded
                            ? "Collapse event"
                            : "Expand event"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Description */}

                  <p className="font-sans text-xs text-zinc-300">
                    {evt.description}
                  </p>

                  {/* Expanded JSON */}

                  {isExpanded && (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-300">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(
                          evt,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLedger;