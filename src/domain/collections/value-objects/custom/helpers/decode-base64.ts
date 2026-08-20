/**
 * Decodes a base64 string back into raw bytes — the inverse of
 * {@link encodeBase64}, and how a consumer reads a `customBinaryVO`-backed
 * property back as binary data.
 *
 * Built on the Web-standard `atob` for the same reason `encodeBase64` uses
 * `btoa`: `domain/` never imports a Node builtin. `atob` returns a binary
 * string (one character per byte), which is copied out character by character.
 *
 * @param value - A base64 string, such as the one a binary VO stores.
 * @returns The decoded bytes.
 *
 * @throws {DOMException} `InvalidCharacterError` — when `value` is not valid
 *   base64. A value read back off a VO cannot hit this: the schema's own
 *   base64 pattern already rejected anything else at construction.
 *
 * @see {@link encodeBase64} — the inverse.
 *
 * @example
 * ```ts
 * const bytes = decodeBase64(user.avatar);
 * ```
 */
export function decodeBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1)
		bytes[index] = binary.charCodeAt(index);

	return bytes;
}
