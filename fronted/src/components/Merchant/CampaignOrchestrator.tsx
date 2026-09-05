import React, { useState } from "react";

import {
  Sparkles,
  Send,
  MessageSquare,
  Smartphone,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Zap,
  Target,
  Users,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

import type {
  Campaign,
  CampaignOrchestrateRequest,
} from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "@/lib/api";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { toast } from "sonner";

export const CampaignOrchestrator: React.FC = () => {
  const queryClient = useQueryClient();

  // ============================================
  // FORM STATE
  // ============================================

  const [orchestratorPrompt, setOrchestratorPrompt] =
    useState(
      "Clear excess running shoes under ₹3,000 with a 15% VIP discount code and multi-channel campaign."
    );

  const [targetCategory, setTargetCategory] =
    useState("footwear");

  const [goal, setGoal] =
    useState("clearance");

  const [discountPercent, setDiscountPercent] =
    useState(15);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [copiedCode, setCopiedCode] =
    useState<string | null>(null);

  // ============================================
  // FETCH CAMPAIGNS
  // ============================================

  const {
    data: campaigns = [],
    isLoading,
    refetch,
  } = useQuery<Campaign[]>({
    queryKey: ["merchant-campaigns"],

    queryFn: () =>
      apiGet<Campaign[]>("/campaigns"),
  });

  // ============================================
  // CREATE / ORCHESTRATE CAMPAIGN
  // ============================================

  const orchestrateMutation =
    useMutation({
      mutationFn: (
        payload: CampaignOrchestrateRequest
      ) =>
        apiPost<Campaign>(
          "/campaigns/orchestrate",
          payload
        ),

      onSuccess: (newCampaign) => {
        queryClient.invalidateQueries({
          queryKey: ["merchant-campaigns"],
        });

        setIsGenerating(false);

        toast.success(
          `AI Campaign "${newCampaign.title}" created successfully!`
        );
      },

      onError: (error) => {
        console.error(
          "Campaign orchestration error:",
          error
        );

        setIsGenerating(false);

        toast.error(
          "Campaign orchestration failed"
        );
      },
    });

  // ============================================
  // TOGGLE CAMPAIGN STATUS
  // ============================================

  const toggleStatusMutation =
    useMutation({
      mutationFn: ({
        id,
        status,
      }: {
        id: string;
        status: string;
      }) =>
        apiPatch(
          `/campaigns/${id}/status?status=${encodeURIComponent(
            status
          )}`
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["merchant-campaigns"],
        });

        toast.success(
          "Campaign status updated"
        );
      },

      onError: (error) => {
        console.error(
          "Campaign status error:",
          error
        );

        toast.error(
          "Failed to update campaign status"
        );
      },
    });

  // ============================================
  // DELETE CAMPAIGN
  // ============================================

  const deleteMutation =
    useMutation({
      mutationFn: (id: string) =>
        apiDelete(
          `/campaigns/${id}`
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["merchant-campaigns"],
        });

        toast.success(
          "Campaign deleted"
        );
      },

      onError: (error) => {
        console.error(
          "Delete campaign error:",
          error
        );

        toast.error(
          "Failed to delete campaign"
        );
      },
    });

  // ============================================
  // GENERATE CAMPAIGN
  // ============================================

  const handleGenerateCampaign = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!orchestratorPrompt.trim()) {
      toast.error(
        "Please describe your marketing objective"
      );

      return;
    }

    setIsGenerating(true);

    orchestrateMutation.mutate({
      prompt:
        orchestratorPrompt.trim(),

      target_category:
        targetCategory,

      goal,

      discount_percent:
        discountPercent,
    });
  };

  // ============================================
  // COPY PROMO CODE
  // ============================================

  const handleCopyCode = async (
    code: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        code
      );

      setCopiedCode(code);

      toast.success(
        `Promo code ${code} copied to clipboard!`
      );

      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (error) {
      console.error(
        "Clipboard error:",
        error
      );

      toast.error(
        "Could not copy promo code"
      );
    }
  };

  // ============================================
  // DELETE CONFIRMATION
  // ============================================

  const handleDeleteCampaign = (
    campaign: Campaign
  ) => {
    const confirmed =
      window.confirm(
        `Delete campaign "${campaign.title}"?`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      campaign.id
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ====================================== */}
      {/* PAGE HEADER */}
      {/* ====================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
              <Sparkles className="h-3 w-3" />
              Autonomous Merchant Agent
            </span>
          </div>

          <h2 className="mt-1 flex items-center gap-2 font-heading text-2xl font-black text-white">
            AI Marketing Campaign Orchestrator
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            AI Agent that plans, creates,
            executes, and monitors
            multi-channel retail campaigns
            automatically.
          </p>
        </div>

        <Button
          data-testid="refresh-campaigns-btn"
          variant="outline"
          onClick={() => refetch()}
          className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ====================================== */}
      {/* ORCHESTRATOR */}
      {/* ====================================== */}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
          <Zap className="h-4 w-4" />

          <span>
            Autonomous Campaign Generator
          </span>
        </div>

        <form
          onSubmit={
            handleGenerateCampaign
          }
          className="space-y-4"
        >
          {/* Prompt */}

          <div>
            <Label className="mb-1 block text-xs font-semibold text-zinc-300">
              Describe Merchant Marketing
              Objective
            </Label>

            <Input
              data-testid="orchestrator-prompt-input"
              value={
                orchestratorPrompt
              }
              onChange={(event) =>
                setOrchestratorPrompt(
                  event.target.value
                )
              }
              placeholder="e.g. Generate weekend clearance campaign for running shoes under ₹3,000..."
              className="h-11 border-zinc-800 bg-zinc-950 text-sm text-zinc-100"
            />
          </div>

          {/* Controls */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Category */}

            <div>
              <Label className="mb-1 block text-[11px] text-zinc-400">
                Target Category
              </Label>

              <select
                data-testid="orchestrator-category-select"
                value={
                  targetCategory
                }
                onChange={(event) =>
                  setTargetCategory(
                    event.target.value
                  )
                }
                className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200"
              >
                <option value="footwear">
                  Footwear (Running Shoes)
                </option>

                <option value="smartwatch">
                  Smartwatches
                </option>

                <option value="electronics">
                  Electronics & Audio
                </option>

                <option value="accessories">
                  Sports Accessories
                </option>
              </select>
            </div>

            {/* Goal */}

            <div>
              <Label className="mb-1 block text-[11px] text-zinc-400">
                Campaign Goal
              </Label>

              <select
                data-testid="orchestrator-goal-select"
                value={goal}
                onChange={(event) =>
                  setGoal(
                    event.target.value
                  )
                }
                className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-200"
              >
                <option value="clearance">
                  Inventory Stock Clearance
                </option>

                <option value="flash_sale">
                  Flash Weekend Sale
                </option>

                <option value="cross_sell_boost">
                  Cross-Sell & Bundle Boost
                </option>

                <option value="retargeting">
                  Cart Abandoner Retargeting
                </option>
              </select>
            </div>

            {/* Discount */}

            <div>
              <Label className="mb-1 block text-[11px] text-zinc-400">
                Discount %
              </Label>

              <select
                data-testid="orchestrator-discount-select"
                value={
                  discountPercent
                }
                onChange={(event) =>
                  setDiscountPercent(
                    Number.parseInt(
                      event.target.value,
                      10
                    )
                  )
                }
                className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 font-mono text-xs text-zinc-200"
              >
                <option value={10}>
                  10% OFF
                </option>

                <option value={15}>
                  15% OFF (Recommended)
                </option>

                <option value={20}>
                  20% OFF
                </option>

                <option value={25}>
                  25% OFF
                </option>
              </select>
            </div>
          </div>

          {/* Submit */}

          <div className="flex justify-end pt-2">
            <Button
              data-testid="orchestrate-submit-btn"
              type="submit"
              disabled={
                isGenerating ||
                orchestrateMutation.isPending
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
            >
              {isGenerating ||
              orchestrateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />

                  <span>
                    AI Agent Orchestrating...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />

                  <span>
                    Autonomously Orchestrate
                    & Deploy Campaign
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ====================================== */}
      {/* CAMPAIGNS HEADER */}
      {/* ====================================== */}

      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-zinc-200">
          <span>
            Active & Monitored Campaigns (
            {campaigns.length})
          </span>
        </h3>

        <span className="text-xs text-zinc-400">
          Multi-Channel Telemetry
        </span>
      </div>

      {/* ====================================== */}
      {/* CAMPAIGNS */}
      {/* ====================================== */}

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-xs text-zinc-500">
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-12 text-center text-xs text-zinc-400">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-zinc-600" />

          <p>
            No campaigns yet.
          </p>

          <p className="mt-1 text-zinc-500">
            Use the orchestrator above to
            deploy your first AI campaign.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const metrics =
              campaign.metrics ?? {
                sent_count: 0,
                clicks: 0,
                orders_generated: 0,
                revenue_generated: 0,
                conversion_rate: 0,
              };

            return (
              <div
                key={campaign.id}
                data-testid={`campaign-card-${campaign.id}`}
                className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-md"
              >
                {/* Campaign Header */}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-zinc-500">
                        {campaign.id}
                      </span>

                      <span
                        data-testid={`campaign-status-${campaign.id}`}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          campaign.status ===
                          "active"
                            ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {
                          campaign.status
                        }
                      </span>

                      {campaign.created_by_agent && (
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[10px] text-blue-300">
                          AI Created
                        </span>
                      )}
                    </div>

                    <h4 className="mt-1 text-base font-bold text-white">
                      {
                        campaign.title
                      }
                    </h4>

                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400">
                      <Target className="h-3.5 w-3.5 text-indigo-400" />

                      <span>
                        Audience:{" "}
                        {
                          campaign.target_audience
                        }
                      </span>
                    </p>
                  </div>

                  {/* Campaign Actions */}

                  <div className="flex items-center gap-2">
                    {/* Discount Code */}

                    <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1 font-mono">
                      <span className="text-xs text-zinc-400">
                        CODE:
                      </span>

                      <span className="text-xs font-bold text-amber-400">
                        {
                          campaign.discount_code
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCode(
                            campaign.discount_code
                          )
                        }
                        className="p-0.5 text-zinc-500 hover:text-white"
                        title="Copy Code"
                      >
                        {copiedCode ===
                        campaign.discount_code ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Toggle */}

                    <button
                      type="button"
                      data-testid={`toggle-camp-btn-${campaign.id}`}
                      onClick={() =>
                        toggleStatusMutation.mutate(
                          {
                            id: campaign.id,
                            status:
                              campaign.status ===
                              "active"
                                ? "paused"
                                : "active",
                          }
                        )
                      }
                      disabled={
                        toggleStatusMutation.isPending
                      }
                      className="rounded-xl bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
                      title={
                        campaign.status ===
                        "active"
                          ? "Pause Campaign"
                          : "Resume Campaign"
                      }
                    >
                      {campaign.status ===
                      "active" ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>

                    {/* Delete */}

                    <button
                      type="button"
                      data-testid={`del-camp-btn-${campaign.id}`}
                      onClick={() =>
                        handleDeleteCampaign(
                          campaign
                        )
                      }
                      disabled={
                        deleteMutation.isPending
                      }
                      className="rounded-xl bg-zinc-800 p-2 text-zinc-400 hover:bg-red-900/40 hover:text-red-400 disabled:opacity-40"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ================================= */}
                {/* GENERATED COPY */}
                {/* ================================= */}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* WhatsApp */}

                  <div className="space-y-2 rounded-xl border border-zinc-800/90 bg-zinc-950 p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-emerald-400">
                      <MessageSquare className="h-3.5 w-3.5" />

                      <span>
                        WhatsApp Broadcast Copy
                      </span>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
                      {
                        campaign.whatsapp_copy
                      }
                    </div>
                  </div>

                  {/* SMS + Forecast */}

                  <div className="space-y-3">
                    <div className="space-y-1.5 rounded-xl border border-zinc-800/90 bg-zinc-950 p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-cyan-400">
                        <Smartphone className="h-3.5 w-3.5" />

                        <span>
                          SMS Flash Copy
                        </span>
                      </div>

                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 font-mono text-[11px] leading-relaxed text-zinc-300">
                        {
                          campaign.sms_copy
                        }
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-indigo-500/20 bg-indigo-950/30 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />

                        <span>
                          Forecast:{" "}
                          {
                            campaign.forecasted_roi
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ================================= */}
                {/* METRICS */}
                {/* ================================= */}

                <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-4 sm:grid-cols-5">
                  {/* Sent */}

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Messages Sent
                    </div>

                    <div className="mt-0.5 font-mono text-sm font-bold text-white">
                      {metrics.sent_count.toLocaleString()}
                    </div>
                  </div>

                  {/* Clicks */}

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Link Clicks
                    </div>

                    <div className="mt-0.5 font-mono text-sm font-bold text-blue-400">
                      {metrics.clicks.toLocaleString()}
                    </div>
                  </div>

                  {/* Orders */}

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Orders Created
                    </div>

                    <div className="mt-0.5 font-mono text-sm font-bold text-emerald-400">
                      {metrics.orders_generated.toLocaleString()}
                    </div>
                  </div>

                  {/* Conversion */}

                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Conversion Rate
                    </div>

                    <div className="mt-0.5 font-mono text-sm font-bold text-amber-400">
                      {metrics.conversion_rate}%
                    </div>
                  </div>

                  {/* Revenue */}

                  <div className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 sm:col-span-1">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Revenue Generated
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 font-mono text-sm font-bold text-emerald-400">
                      <DollarSign className="h-3.5 w-3.5" />

                      ₹
                      {metrics.revenue_generated.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignOrchestrator;