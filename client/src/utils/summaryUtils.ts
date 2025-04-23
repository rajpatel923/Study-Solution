import { format, formatDistanceToNow } from "date-fns";

/**
 * Format a date string to a human-readable format
 * @param dateString ISO date string
 * @returns Formatted date string (e.g., "Apr 18, 2025")
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Format a date string to a relative time format
 * @param dateString ISO date string
 * @returns Relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "recently";
  }
};

/**
 * Truncate text to a specified length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number = 150): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Strip HTML tags from a string
 * @param html HTML string
 * @returns Plain text with HTML tags removed
 */
export const stripHtml = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

/**
 * Extract first few sentences from text for preview
 * @param text Text to extract preview from
 * @param maxSentences Maximum number of sentences to include
 * @returns Preview text with first few sentences
 */
export const getSummaryPreview = (
  text: string,
  maxSentences: number = 2
): string => {
  if (!text) return "";

  // Strip HTML tags
  const cleanText = stripHtml(text);

  // Split by sentence endings (., !, ?)
  const sentences = cleanText.split(/(?<=[.!?])\s+/);

  // Take first N sentences
  const previewSentences = sentences.slice(
    0,
    Math.min(maxSentences, sentences.length)
  );

  // Join and truncate if needed
  return truncateText(previewSentences.join(" "), 200);
};

/**
 * Get appropriate icon name based on content type
 * @param contentType Content type string
 * @returns Icon name for the content type
 */
export const getContentTypeIcon = (contentType: string): string => {
  switch (contentType.toLowerCase()) {
    case "pdf":
      return "document-text";
    case "webpage":
      return "globe";
    case "youtube":
      return "play-circle";
    default:
      return "document";
  }
};

/**
 * Get appropriate color class based on summary length
 * @param length Summary length ("short", "medium", "long")
 * @returns Tailwind CSS color class
 */
export const getLengthBadgeColor = (length: string): string => {
  switch (length) {
    case "short":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "long":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Format word count with appropriate suffix
 * @param count Word count number
 * @returns Formatted word count string
 */
export const formatWordCount = (count: number): string => {
  if (count < 1000) {
    return `${count} words`;
  } else {
    return `${(count / 1000).toFixed(1)}k words`;
  }
};
