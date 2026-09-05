/**
 * Thin fetch wrapper for talking to the FastAPI backend.
 *
 * Base URL comes from VITE_API_URL.
 * Falls back to "/api" for same-origin deployments.
 */

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "/api";

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

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

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
      } else if (detail !== undefined && detail !== null) {
        message = String(detail);
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