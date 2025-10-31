import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retry wrapper for async functions with exponential backoff
 */
export async function withRetries<TReturn>(
  fn: () => Promise<TReturn>,
  { retries = 5 }: { retries?: number } = {},
) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      return withRetries(fn, { retries: retries - 1 });
    }
    throw err;
  }
}

/**
 * Convert unknown error to Error object
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === "object" && "message" in e) {
    return new Error(String(e.message));
  }
  return new Error(String(e ?? "Unknown error"));
}
