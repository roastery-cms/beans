/** How many bytes to convert per `String.fromCharCode` call. */
const CHUNK_SIZE = 0x8000;

/**
 * Encodes raw bytes as a base64 string — the form `customBinaryVO` stores, and
 * therefore the conversion a caller runs before handing binary data to a
 * blueprint key backed by it.
 *
 * Built on the Web-standard `btoa`, never on `node:buffer`: `domain/` stays
 * runtime-agnostic, and `src/testing/` is the one place in the package allowed
 * to reach for a Node builtin. `btoa` reads a binary string (one character per
 * byte), so the bytes are converted in chunks rather than through a single
 * spread — `String.fromCharCode(...bytes)` overflows the call stack on a
 * buffer of any real size.
 *
 * @param bytes - The raw bytes to encode.
 * @returns The base64 representation, padded.
 *
 * @see {@link decodeBase64} — the inverse.
 *
 * @example
 * ```ts
 * const Avatar = customBinaryVO({ options: { maxBytes: 1_048_576 } });
 *
 * new User({ avatar: encodeBase64(pngBytes) });
 * ```
 */
export function encodeBase64(bytes: Uint8Array): string {
	let binary = "";

	for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE)
		binary += String.fromCharCode(
			...bytes.subarray(offset, offset + CHUNK_SIZE),
		);

	return btoa(binary);
}
