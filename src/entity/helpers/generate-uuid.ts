import { uuid } from "@roastery/terroir";

/**
 * Generates a fresh UUID v7 string.
 *
 * UUID v7 is **time-sortable** — the leading 48 bits encode a Unix-millisecond
 * timestamp — which makes it the right default for entity ids: rows order by
 * creation time without needing a separate `createdAt` index, and clock-skew
 * across instances stays bounded by the millisecond resolution.
 *
 * @returns A canonical 36-character lower-case UUID v7 string.
 *
 * @example
 * ```ts
 * import { generateUUID } from "@roastery/beans/entity";
 *
 * const id = generateUUID(); // e.g. "018f5c8e-2e1f-7b3a-8c4d-9a8b7c6d5e4f"
 * ```
 */
export function generateUUID(): string {
	return uuid.v7();
}
