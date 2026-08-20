import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import { base64ByteLength } from "./helpers/base64-byte-length";
import type {
	IBinaryValueObjectOptions,
	ICustomValueObjectArgs,
	ValueObjectClassOf,
} from "./types";

/** Padded base64, and nothing else — no whitespace, no url-safe alphabet. */
const BASE64_PATTERN =
	"^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$";

/** Placeholder default: the empty payload, which the pattern accepts. */
const BINARY_PLACEHOLDER = "";

/** Fallback `source` for the eager-default exception when no `name` was given. */
const ANONYMOUS_SOURCE = "value-object";

/**
 * Builds a binary `ValueObject` **class** — a file, an image, a signature, any
 * property whose domain value is a blob of bytes.
 *
 * **The value is a base64 `string`, not a `Uint8Array`**, and deliberately so:
 * `Entity.toJSON()` emits each value-object's wrapped `value` as-is, so a
 * `Uint8Array` would serialize to `{"type":"Buffer","data":[…]}` through
 * `JSON.stringify` and the package's round-trip guarantee
 * (`fromJSON(JSON.parse(JSON.stringify(entity.toJSON())))`) would break on it.
 * Base64 is JSON-safe by construction, so persistence, hydration and the
 * derived schema all keep working untouched. The conversion stays explicit at
 * the call site, through {@link encodeBase64} / {@link decodeBase64}.
 *
 * `minBytes`/`maxBytes` are checked against the **exact** decoded size in the
 * generated class's `validate`, not lowered into `minLength`/`maxLength`: a
 * base64 group of four characters carries one, two or three bytes depending on
 * its padding, so a length-derived bound would accept up to two bytes past
 * what was declared. When the caller passes a `validate` hook of its own, the
 * bounds run first and the hook only sees a payload already within them.
 *
 * The default is checked against those bounds by the factory itself — the
 * schema cannot see them, so without that check a default outside the bounds
 * would only fail at the first `demo()`, which is exactly the latent failure
 * {@link defineValueObject}'s own eager check exists to prevent.
 *
 * **Call it at module scope, once** — see {@link defineValueObject} for why.
 *
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 *
 * @param args - Schema options (including `minBytes`/`maxBytes`), demo-mode
 *   default, and behaviour hooks. When `default` is omitted it is `""`, the
 *   empty payload.
 * @returns The generated binary value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   the placeholder `""`) is not valid base64, or falls outside
 *   `minBytes`/`maxBytes`.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see {@link encodeBase64} and {@link decodeBase64} — bytes in, bytes out.
 *
 * @example
 * ```ts
 * const Avatar = customBinaryVO({
 * 	options: { maxBytes: 1_048_576 },
 * 	name: "Avatar",
 * });
 *
 * const userProperties = { avatar: Avatar };
 *
 * new User({ avatar: encodeBase64(pngBytes) });
 * decodeBase64(user.avatar); // → Uint8Array
 * ```
 */
export function customBinaryVO<Sensitive extends boolean = false>(
	args: ICustomValueObjectArgs<
		string,
		IBinaryValueObjectOptions,
		Sensitive
	> = {},
): ValueObjectClassOf<string, t.TString, Sensitive> {
	const { default: fallback = BINARY_PLACEHOLDER, options, ...hooks } = args;
	const { maxBytes, minBytes, ...schemaOptions } = options ?? {};

	const withinBounds = (value: string): boolean => {
		const bytes = base64ByteLength(value);

		return (
			(minBytes === undefined || bytes >= minBytes) &&
			(maxBytes === undefined || bytes <= maxBytes)
		);
	};

	// The schema knows nothing about `minBytes`/`maxBytes`, so `defineValueObject`'s
	// own eager check cannot cover them. Thunks are skipped for the same reason it
	// skips them: evaluating one here would defeat the laziness it was declared for.
	if (typeof fallback !== "function" && !withinBounds(fallback))
		throw new InvalidEntityDefinitionException(
			hooks.name ?? ANONYMOUS_SOURCE,
			"Binary value-object: the declared default falls outside the declared `minBytes`/`maxBytes`. The base validates the default like any other value, so demo mode — and every entity whose blueprint includes this class — would fail on it.",
		);

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.String({ ...schemaOptions, pattern: BASE64_PATTERN }),
		validate: (value, context) =>
			withinBounds(value) &&
			(hooks.validate === undefined || hooks.validate(value, context)),
	});
}
