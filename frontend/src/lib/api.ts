/**
 * Thin fetch wrapper for talking to the FastAPI backend.
 *
 * Base URL comes from VITE_API_URL.
 * Falls back to "/api" for same-origin deployments.
 */

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "/api";


// ============================================================
// MERCHANT KEY
//
// Merchant endpoints (inventory edits, campaigns, orders, audit)
// need the X-Merchant-Key header. The key is typed in by the
// merchant and kept for this browser tab only. It is never baked
// into the bundle, so a deployed storefront doesn't leak it.
// ============================================================

const MERCHANT_KEY_STORAGE = "nexus_merchant_key";

export const MERCHANT_KEY_EVENT = "nexus:merchant-key-changed";

export function getMerchantKey(): string | null {
  try {
    return sessionStorage.getItem(MERCHANT_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setMerchantKey(key: string | null): void {
  try {
    if (key) {
      sessionStorage.setItem(MERCHANT_KEY_STORAGE, key);
    } else {
      sessionStorage.removeItem(MERCHANT_KEY_STORAGE);
    }
  } catch {
    // Storage unavailable (private mode): the key just won't persist.
  }

  window.dispatchEvent(new Event(MERCHANT_KEY_EVENT));
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const merchantKey = getMerchantKey();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(merchantKey ? { "X-Merchant-Key": merchantKey } : {}),
      ...(options.headers || {}),
    },
  });

  // A rejected key is cleared so the merchant gate asks again.
  if (response.status === 401 && merchantKey) {
    setMerchantKey(null);
  }

  // Read response body once.
  const rawText = await response.text();

  let parsedBody: unknown = null;

  if (rawText) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = rawText;
    }
  }

  // Handle HTTP errors.
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    if (
      parsedBody !== null &&
      typeof parsedBody === "object" &&
      "detail" in parsedBody
    ) {
      const detail = (parsedBody as Record<string, unknown>).detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        // FastAPI validation errors: [{ loc, msg, ... }]
        message = detail
          .map((item) =>
            item && typeof item === "object" && "msg" in item
              ? String((item as { msg: unknown }).msg)
              : String(item)
          )
          .join("; ");
      } else if (detail !== undefined && detail !== null) {
        message = JSON.stringify(detail);
      }
    }

    throw new ApiError(
      message,
      response.status,
      parsedBody
    );
  }

  return parsedBody as T;
}


// ============================================================
// GET
// ============================================================

export function apiGet<T>(
  path: string
): Promise<T> {
  return request<T>(path, {
    method: "GET",
  });
}


// ============================================================
// POST
// ============================================================

export function apiPost<T>(
  path: string,
  body?: unknown
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });
}


// ============================================================
// PUT
// ============================================================

export function apiPut<T>(
  path: string,
  body?: unknown
): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });
}


// ============================================================
// PATCH
// ============================================================

export function apiPatch<T>(
  path: string,
  body?: unknown
): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });
}


// ============================================================
// DELETE
// ============================================================

export function apiDelete<T = unknown>(
  path: string
): Promise<T> {
  return request<T>(path, {
    method: "DELETE",
  });
}


// ============================================================
// ERROR EXPORT
// ============================================================

export { ApiError };