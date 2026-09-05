import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Send,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  Layers,
} from "lucide-react";

import type {
  Product,
  ChatMessage,
  AgentReasoningStep,
} from "@/types";

import { ProductCard } from "./ProductCard";
import { UpsellBanner } from "./UpsellBanner";
import { AgentDecisionInspector } from "./AgentDecisionInspector";

import { apiPost } from "@/lib/api";
import { toast } from "sonner";

interface ChatPanelProps {
  onAddToCart: (
    product: Product,
    size?: string,
    color?: string
  ) => void;

  onInstantBuy: (
    product: Product,
    size?: string,
    color?: string,
    bundleUpsells?: Product[]
  ) => Promise<void>;

  onRemoveFromCart?: (productId: string) => void;
}

const QUICK_PROMPTS = [
  "I need running shoes under ₹3,000.",
  "Show me lightweight 5K marathon shoes under ₹2,000",
  "I want an AMOLED smartwatch with SpO2 under ₹4,000",
  "Show me wireless ANC gym headphones under ₹3,000",
];

interface AgentChatResponse {
  session_id: string;
  reply: string;
  reasoning: AgentReasoningStep;
  recommended_products: Product[];
  upsell_products: Product[];
  message_id: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onAddToCart,
  onInstantBuy,
  onRemoveFromCart,
}) => {
  // ============================================
  // CHAT STATE
  // ============================================

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: "welcome-msg",
        role: "assistant",
        content:
          "Hello! I am **Nexus AI**, your intelligent commerce agent. Tell me what you're looking for in natural language — like *“I need running shoes under ₹3,000”* — and I'll search our live merchant warehouse, check real-time stock, and prepare your 1-click Razorpay checkout!",
        timestamp: new Date().toISOString(),

        agent_reasoning: {
          intent_summary:
            "AI Agent initialized & connected to merchant warehouse",

          budget_extracted: null,

          category_extracted: null,

          catalog_matches_found: 12,

          inventory_status:
            "Warehouse inventory synchronized (12 SKUs active)",

          recommendation_rationale:
            "Ready to process natural language shopper constraints",

          upsell_strategy:
            "Dynamic cross-sell engine armed",

          execution_time_ms: 45,

          confidence_score: 1.0,
        },
      },
    ]);

  const [inputQuery, setInputQuery] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [activeReasoning, setActiveReasoning] =
    useState<AgentReasoningStep | null>(
      messages[0]?.agent_reasoning || null
    );

  const [recommendedProducts, setRecommendedProducts] =
    useState<Product[]>([]);

  const [upsellProducts, setUpsellProducts] =
    useState<Product[]>([]);

  const [selectedUpsellIds, setSelectedUpsellIds] =
    useState<string[]>([]);

  const [sessionId, setSessionId] =
    useState<string | undefined>(undefined);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  // ============================================
  // SCROLL CHAT TO BOTTOM
  // ============================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [
    messages,
    recommendedProducts,
    isLoading,
  ]);

  // ============================================
  // SEND MESSAGE TO AI AGENT
  // ============================================

  const handleSend = async (
    queryText?: string
  ) => {
    const textToSend = (
      queryText ?? inputQuery
    ).trim();

    if (!textToSend || isLoading) {
      return;
    }

    // Clear input immediately.
    setInputQuery("");

    // Add user message to UI.
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [
      ...prev,
      userMsg,
    ]);

    setIsLoading(true);

    try {
      const response =
        await apiPost<AgentChatResponse>(
          "/agent/chat",
          {
            session_id: sessionId,
            message: textToSend,
          }
        );

      // ========================================
      // UPDATE SESSION
      // ========================================

      setSessionId(
        response.session_id
      );

      // ========================================
      // UPDATE AI REASONING
      // ========================================

      setActiveReasoning(
        response.reasoning
      );

      // ========================================
      // UPDATE RECOMMENDATIONS
      // ========================================

      setRecommendedProducts(
        response.recommended_products ?? []
      );

      setUpsellProducts(
        response.upsell_products ?? []
      );

      /*
       * Reset previously selected upsells when
       * the AI produces a new recommendation set.
       */
      setSelectedUpsellIds([]);

      // ========================================
      // ADD ASSISTANT MESSAGE
      // ========================================

      const assistantMsg: ChatMessage = {
        id: response.message_id,

        role: "assistant",

        content: response.reply,

        timestamp:
          new Date().toISOString(),

        agent_reasoning:
          response.reasoning,

        recommended_product_ids:
          response.recommended_products.map(
            (product) => product.id
          ),

        upsell_product_ids:
          response.upsell_products.map(
            (product) => product.id
          ),
      };

      setMessages((prev) => [
        ...prev,
        assistantMsg,
      ]);
    } catch (error) {
      console.error(
        "AI agent request failed:",
        error
      );

      toast.error(
        "Could not reach AI agent. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // TOGGLE UPSELL PRODUCT
  // ============================================

  const handleToggleUpsell = (
    product: Product
  ) => {
    const isSelected =
      selectedUpsellIds.includes(
        product.id
      );

    if (isSelected) {
      setSelectedUpsellIds(
        (prev) =>
          prev.filter(
            (id) => id !== product.id
          )
      );

      // Actually remove it from the cart too — otherwise the
      // customer is still charged for something the UI shows
      // as removed.
      onRemoveFromCart?.(product.id);

      toast.info(
        `Removed ${product.name} from bundle`
      );

      return;
    }

    setSelectedUpsellIds(
      (prev) => [
        ...prev,
        product.id,
      ]
    );

    /*
     * Add the upsell product to cart as well.
     */
    onAddToCart(product);

    toast.success(
      `Added ${product.name} with bundle discount!`
    );
  };

  // ============================================
  // BUY NOW FROM PRODUCT CARD
  // ============================================

  const handleTriggerInstantBuy = (
    product: Product,
    size?: string,
    color?: string
  ) => {
    /*
     * Only currently selected upsells are passed
     * to the checkout flow.
     */
    const selectedUpsells =
      upsellProducts.filter((upsell) =>
        selectedUpsellIds.includes(
          upsell.id
        )
      );

    onInstantBuy(
      product,
      size,
      color,
      selectedUpsells
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* ======================================== */}
      {/* LEFT COLUMN */}
      {/* ======================================== */}

      <div className="col-span-12 flex flex-col space-y-4 lg:col-span-7">
        {/* ====================================== */}
        {/* QUICK PROMPTS */}
        {/* ====================================== */}

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 p-3.5 shadow-md">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />

            <span>
              Try asking the AI Agent:
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(
              (prompt, index) => (
                <button
                  key={prompt}
                  type="button"
                  data-testid={`quick-prompt-btn-${index}`}
                  onClick={() =>
                    handleSend(prompt)
                  }
                  disabled={isLoading}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-800/90 px-3 py-1.5 text-left text-xs font-medium text-zinc-200 transition-all hover:border-blue-500/50 hover:bg-blue-900/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              )
            )}
          </div>
        </div>

        {/* ====================================== */}
        {/* CHAT STREAM */}
        {/* ====================================== */}

        <div
          data-testid="chat-stream"
          className="min-h-[480px] max-h-[640px] space-y-5 overflow-y-auto rounded-2xl border border-zinc-800/90 bg-zinc-950 p-4 shadow-inner sm:p-5"
        >
          {messages.map((msg) => {
            const isUser =
              msg.role === "user";

            return (
              <div
                key={msg.id}
                data-testid={`chat-message-${msg.id}`}
                className={`flex gap-3 ${
                  isUser
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {/* AI Avatar */}

                {!isUser && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20">
                    <Bot className="h-4 w-4 text-blue-400" />
                  </div>
                )}

                {/* Message */}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[80%] ${
                    isUser
                      ? "rounded-tr-sm bg-blue-600 font-medium text-white shadow-md shadow-blue-600/10"
                      : "rounded-tl-sm border border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>

                {/* User Avatar */}

                {isUser && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800">
                    <User className="h-4 w-4 text-zinc-300" />
                  </div>
                )}
              </div>
            );
          })}

          {/* ==================================== */}
          {/* LOADING INDICATOR */}
          {/* ==================================== */}

          {isLoading && (
            <div
              data-testid="agent-loading-indicator"
              className="flex items-center gap-3 py-2 text-xs text-zinc-400"
            >
              <div className="flex h-8 w-8 shrink-0 animate-spin items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20">
                <RefreshCw className="h-4 w-4 text-blue-400" />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />

                <span>
                  Searching merchant catalog &amp;
                  verifying stock...
                </span>
              </div>
            </div>
          )}

          {/* ==================================== */}
          {/* PRODUCT RECOMMENDATIONS */}
          {/* ==================================== */}

          {recommendedProducts.length >
            0 && (
            <div className="space-y-4 pt-2">
              {/* Section header */}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-200">
                  <Layers className="h-4 w-4 text-blue-400" />

                  <span>
                    Matching Products from Catalog
                  </span>
                </h4>

                <span className="text-xs text-zinc-500">
                  {recommendedProducts.length}{" "}
                  Options Found
                </span>
              </div>

              {/* Primary product */}

              <ProductCard
                product={
                  recommendedProducts[0]
                }
                onAddToCart={
                  onAddToCart
                }
                onInstantBuy={
                  handleTriggerInstantBuy
                }
                isPrimary={true}
              />

              {/* Alternative products */}

              {recommendedProducts.length >
                1 && (
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  {recommendedProducts
                    .slice(1, 3)
                    .map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={
                          onAddToCart
                        }
                        onInstantBuy={
                          handleTriggerInstantBuy
                        }
                        isPrimary={false}
                      />
                    ))}
                </div>
              )}

              {/* ================================= */}
              {/* UPSELL BANNER */}
              {/* ================================= */}

              {upsellProducts.length >
                0 && (
                <UpsellBanner
                  upsellProducts={
                    upsellProducts
                  }
                  onAddUpsell={
                    handleToggleUpsell
                  }
                  selectedUpsellIds={
                    selectedUpsellIds
                  }
                />
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ======================================== */}
        {/* CHAT INPUT */}
        {/* ======================================== */}

        <form
          data-testid="chat-input-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-lg transition-colors focus-within:border-blue-500/60"
        >
          <input
            data-testid="chat-input"
            type="text"
            value={inputQuery}
            onChange={(event) =>
              setInputQuery(
                event.target.value
              )
            }
            placeholder="Type query in natural language (e.g. 'I need running shoes under ₹3,000')..."
            disabled={isLoading}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <button
            data-testid="chat-submit-btn"
            type="submit"
            disabled={
              !inputQuery.trim() ||
              isLoading
            }
            className="flex h-10 shrink-0 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}

            <span>
              {isLoading
                ? "Searching..."
                : "Search"}
            </span>
          </button>
        </form>
      </div>

      {/* ======================================== */}
      {/* RIGHT COLUMN */}
      {/* ======================================== */}

      <div className="sticky top-20 col-span-12 space-y-4 lg:col-span-5">
        <AgentDecisionInspector
          reasoning={activeReasoning}
          isLoading={isLoading}
        />

        {/* ====================================== */}
        {/* COMMERCE PIPELINE */}
        {/* ====================================== */}

        <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-zinc-300">
            <Sparkles className="h-4 w-4 text-amber-400" />

            <span>
              Autonomous Commerce Pipeline
            </span>
          </div>

          <p className="leading-relaxed text-zinc-400">
            The AI Agent translates natural
            conversational requests directly into
            database catalog lookups, verifies
            real-time inventory, attaches bundle
            discounts, and generates Razorpay
            payment sessions without manual store
            navigation.
          </p>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-[11px] text-zinc-500">
            <span>
              Powered by Google Gemini
            </span>

            <span className="font-mono text-emerald-400">
              Razorpay Test Mode Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;