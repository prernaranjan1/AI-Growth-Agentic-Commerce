import React from "react";

import {
  Brain,
  Database,
  Boxes,
  Sparkles,
  CreditCard,
  Cpu,
  Activity,
} from "lucide-react";

import type { AgentReasoningStep } from "@/types";

interface AgentDecisionInspectorProps {
  reasoning: AgentReasoningStep | null;
  isLoading?: boolean;
}

export const AgentDecisionInspector: React.FC<
  AgentDecisionInspectorProps
> = ({
  reasoning,
  isLoading = false,
}) => {
  return (
    <div
      data-testid="agent-decision-inspector"
      className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 font-mono shadow-2xl backdrop-blur-xl sm:p-5"
    >
      {/* ======================================== */}
      {/* HEADER */}
      {/* ======================================== */}

      <div className="mb-4 flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
            <Cpu className="h-4 w-4 text-blue-400" />
          </div>

          <div>
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-zinc-100">
              AI Decision &amp; Intent Inspector
            </h4>

            <p className="font-sans text-[10px] text-zinc-400">
              Real-time audit trace of agent reasoning pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              <Activity className="h-3 w-3 animate-spin" />

              Reasoning...
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              Trace Synced
            </span>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* METRICS */}
      {/* ======================================== */}

      {reasoning && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {/* Execution */}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 text-center">
            <div className="text-[10px] uppercase text-zinc-500">
              Execution
            </div>

            <div className="text-xs font-bold text-blue-400">
              {reasoning.execution_time_ms}ms
            </div>
          </div>

          {/* Confidence */}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 text-center">
            <div className="text-[10px] uppercase text-zinc-500">
              Confidence
            </div>

            <div className="text-xs font-bold text-emerald-400">
              {Math.round(
                reasoning.confidence_score * 100
              )}
              %
            </div>
          </div>

          {/* Catalog matches */}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 text-center">
            <div className="text-[10px] uppercase text-zinc-500">
              SKUs Matched
            </div>

            <div className="text-xs font-bold text-amber-400">
              {reasoning.catalog_matches_found} Found
            </div>
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* PIPELINE */}
      {/* ======================================== */}

      <div className="relative space-y-3.5">
        {/* ====================================== */}
        {/* STEP 1 — INTENT */}
        {/* ====================================== */}

        <div
          data-testid="agent-step-intent"
          className="flex items-start gap-3 text-xs"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-500/40 bg-blue-500/20">
            <Brain className="h-3.5 w-3.5 text-blue-400" />
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold text-blue-400">
              <span>
                1. Natural Language Intent
              </span>

              <span className="text-[9px] text-zinc-500">
                LLM PARSE
              </span>
            </div>

            <div className="text-xs text-zinc-200">
              {reasoning
                ? reasoning.intent_summary
                : "Waiting for customer input..."}
            </div>

            {(reasoning?.budget_extracted != null ||
              reasoning?.category_extracted) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                {reasoning.budget_extracted != null && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-blue-300">
                    Budget Cap: ₹
                    {reasoning.budget_extracted.toLocaleString(
                      "en-IN"
                    )}
                  </span>
                )}

                {reasoning.category_extracted && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">
                    Category:{" "}
                    {reasoning.category_extracted}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====================================== */}
        {/* STEP 2 — CATALOG */}
        {/* ====================================== */}

        <div
          data-testid="agent-step-catalog"
          className="flex items-start gap-3 text-xs"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-purple-500/40 bg-purple-500/20">
            <Database className="h-3.5 w-3.5 text-purple-400" />
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold text-purple-400">
              <span>
                2. Merchant Catalog Query
              </span>

              <span className="text-[9px] text-zinc-500">
                DB LOOKUP
              </span>
            </div>

            <div className="text-xs text-zinc-300">
              {reasoning
                ? `Matched ${reasoning.catalog_matches_found} candidate products within budget parameters`
                : "Catalog query idle"}
            </div>
          </div>
        </div>

        {/* ====================================== */}
        {/* STEP 3 — INVENTORY */}
        {/* ====================================== */}

        <div
          data-testid="agent-step-inventory"
          className="flex items-start gap-3 text-xs"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/20">
            <Boxes className="h-3.5 w-3.5 text-emerald-400" />
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold text-emerald-400">
              <span>
                3. Live Warehouse Inventory
              </span>

              <span className="text-[9px] text-zinc-500">
                STOCK CHECK
              </span>
            </div>

            <div className="text-xs text-zinc-300">
              {reasoning
                ? reasoning.inventory_status
                : "Checking SKU stock quantities..."}
            </div>
          </div>
        </div>

        {/* ====================================== */}
        {/* STEP 4 — RECOMMENDATION */}
        {/* ====================================== */}

        <div
          data-testid="agent-step-rationale"
          className="flex items-start gap-3 text-xs"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold text-amber-400">
              <span>
                4. Recommendation Rationale
              </span>

              <span className="text-[9px] text-zinc-500">
                AI RANKED
              </span>
            </div>

            <div className="text-xs text-zinc-300">
              {reasoning
                ? reasoning.recommendation_rationale
                : "Scoring top product picks..."}
            </div>
          </div>
        </div>

        {/* ====================================== */}
        {/* STEP 5 — UPSELL */}
        {/* ====================================== */}

        <div
          data-testid="agent-step-upsell"
          className="flex items-start gap-3 text-xs"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-500/20">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold text-cyan-400">
              <span>
                5. Upsell / Cross-Sell Engine
              </span>

              <span className="text-[9px] text-zinc-500">
                BUNDLE BOOST
              </span>
            </div>

            <div className="text-xs text-zinc-300">
              {reasoning
                ? reasoning.upsell_strategy
                : "Formulating cross-sell bundle..."}
            </div>
          </div>
        </div>

        {/* ====================================== */}
        {/* STEP 6 — RAZORPAY */}
        {/* ====================================== */}

        <div
          data-testid="agent-step-razorpay"
          className="flex items-start gap-3 text-xs"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-blue-400/50 bg-blue-600/30">
            <CreditCard className="h-3.5 w-3.5 text-blue-300" />
          </div>

          <div className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <div className="mb-0.5 flex items-center justify-between text-[11px] font-bold text-blue-300">
              <span>
                6. Razorpay Payment Gateway
              </span>

              <span className="text-[9px] text-emerald-400">
                READY
              </span>
            </div>

            <div className="text-xs text-zinc-300">
              1-Click instant test checkout enabled
              (UPI, Card, NetBanking)
            </div>
          </div>
        </div>
      </div>

      {/* ======================================== */}
      {/* FOOTER */}
      {/* ======================================== */}

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3 text-[10px] text-zinc-600">
        <span>Agent Trace</span>

        <span className="font-mono text-emerald-500/80">
          {reasoning
            ? "LIVE"
            : "WAITING"}
        </span>
      </div>
    </div>
  );
};

export default AgentDecisionInspector;