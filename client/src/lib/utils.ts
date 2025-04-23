import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function countWords(text: string): number {
  return text
    .replace(/<[^>]*>?/gm, "") // Remove HTML tags
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * Truncate text to a specified length and add ellipsis
 */
export function truncateText(text: string, maxLength: number = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSecs < 60) return "just now";
  if (diffInMins < 60)
    return `${diffInMins} minute${diffInMins === 1 ? "" : "s"} ago`;
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  if (diffInDays < 30)
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;

  return formatDate(d);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .substring(0, 2);
}

/**
 * Create a delay using Promise
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
