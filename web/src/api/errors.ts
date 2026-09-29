/**
 * Single place that turns an API error into a message worth showing a user.
 *
 * Axios's own `error.message` is "Request failed with status code 400", which
 * tells the user nothing. The useful text lives in `response.data.message`:
 *  - NestJS HttpException  -> a single string ("Only DRAFT invoices can be issued.")
 *  - ValidationPipe        -> one string per invalid field, so they get joined
 *  - anything else         -> serialised, and only as a last resort
 *
 * Every error display in the UI goes through here; a page that reaches for
 * `error.message` directly is showing a status code as if it were an
 * explanation.
 */
const FALLBACK_MESSAGE = "Có lỗi xảy ra. Vui lòng thử lại.";

type MaybeAxiosError = {
  response?: {
    data?: unknown;
  };
};

function extractMessage(data: unknown): string | null {
  // Unknown shape here is normal, not exceptional: the response body is
  // whatever the server sent, and the three cases below cover the backend.
  if (!data || typeof data !== "object") {
    return null;
  }

  const message = (data as { message?: unknown }).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const parts = message.filter(
      (part): part is string => typeof part === "string" && part.trim() !== "",
    );
    if (parts.length) {
      return parts.join("; ");
    }
  }

  if (message && typeof message === "object") {
    return JSON.stringify(message);
  }

  return null;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string = FALLBACK_MESSAGE,
): string {
  if (error && typeof error === "object") {
    const fromResponse = extractMessage((error as MaybeAxiosError).response?.data);
    if (fromResponse) {
      return fromResponse;
    }
  }

  return fallback;
}
