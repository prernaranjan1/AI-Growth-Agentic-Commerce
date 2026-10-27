import React, { useEffect, useState } from "react";
import { KeyRound, Lock } from "lucide-react";

import {
  MERCHANT_KEY_EVENT,
  getMerchantKey,
  setMerchantKey,
} from "@/lib/api";

interface MerchantKeyGateProps {
  children: React.ReactNode;
}

/**
 * Asks for the merchant key (MERCHANT_API_KEY on the backend) before
 * showing merchant tools. The key lives in sessionStorage for this tab.
 */
export const MerchantKeyGate: React.FC<MerchantKeyGateProps> = ({
  children,
}) => {
  const [merchantKey, setKeyState] = useState<string | null>(
    getMerchantKey()
  );
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const sync = () => setKeyState(getMerchantKey());

    window.addEventListener(MERCHANT_KEY_EVENT, sync);
    return () => window.removeEventListener(MERCHANT_KEY_EVENT, sync);
  }, []);

  if (merchantKey) {
    return (
      <div>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMerchantKey(null)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock merchant tools
          </button>
        </div>

        {/* Remount children when the key changes so queries refetch. */}
        <div key={merchantKey}>{children}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
          <KeyRound className="h-4 w-4 text-blue-400" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Merchant access
          </h2>
          <p className="text-xs text-zinc-400">
            Enter the MERCHANT_API_KEY set in backend/.env.
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          if (value) {
            setMerchantKey(value);
            setDraft("");
          }
        }}
        className="flex gap-2"
      >
        <input
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Merchant key"
          aria-label="Merchant key"
          className="h-10 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Unlock
        </button>
      </form>
    </div>
  );
};

export default MerchantKeyGate;
