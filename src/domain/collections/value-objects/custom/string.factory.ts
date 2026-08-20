import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/** Placeholder default, matching `StringVO`'s. Six characters long. */
const STRING_PLACEHOLDER = "string";

/**
 * Builds a string `ValueObject` **class** constrained by TypeBox string
 * options — the practical way to say "this field needs at least four
 * characters" inside a blueprint, without declaring a schema and a subclass
 * for it.
 *
 * When `default` is omitted it falls back to `"string"`, which the factory
 * then validates against the schema it just built. So a `minLength: 8` with no
 * declared default throws at import time rather than at the first `demo()`.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 * @param args - Schema options, demo-mode default, and behaviour hooks.
 * @returns The generated string value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   placeholder) does not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see `StringVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   unconstrained, hand-written equivalent.
 *
 * @example
 * ```ts
 * const PostTitle = customStringVO({
 * 	options: { minLength: 4, maxLength: 120 },
 * 	default: "title",
 * 	name: "PostTitle",
 * });
 *
 * const postProperties = { title: PostTitle };
 * ```
 */
export function customStringVO<Sensitive extends boolean = false>(
	args: ICustomValueObjectArgs<string, t.StringOptions, Sensitive> = {},
): ValueObjectClassOf<string, t.TString, Sensitive> {
	const { default: fallback = STRING_PLACEHOLDER, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.String(options),
	});
}
