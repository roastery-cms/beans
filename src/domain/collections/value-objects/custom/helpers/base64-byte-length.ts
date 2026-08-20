/** Characters per base64 group, each encoding three bytes. */
const GROUP_SIZE = 4;

/** Bytes encoded by one full base64 group. */
const GROUP_BYTES = 3;

/** The character base64 pads an incomplete group with. */
const PADDING = "=";

/**
 * Counts how many bytes a base64 string decodes to, without decoding it.
 *
 * Internal to `customBinaryVO`, which needs the **exact** byte count to honour
 * `minBytes`/`maxBytes`. Deriving the bound from the string's length instead
 * would be off by up to two bytes — a group of four characters carries one,
 * two or three bytes depending on its padding — so `maxBytes: 1` expressed as
 * `maxLength: 4` would happily accept three bytes.
 *
 * @param value - A padded base64 string.
 * @returns The number of bytes it represents.
 *
 * @example
 * ```ts
 * base64ByteLength("AAA=");  // → 2
 * base64ByteLength("AAAA");  // → 3
 * ```
 */
export function base64ByteLength(value: string): number {
	if (value.length === 0) return 0;

	const padding = value.endsWith(`${PADDING}${PADDING}`)
		? 2
		: value.endsWith(PADDING)
			? 1
			: 0;

	return (value.length / GROUP_SIZE) * GROUP_BYTES - padding;
}
