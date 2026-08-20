import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/**
 * Builds an enum `ValueObject` **class** from a fixed set of literal values —
 * the "one of these exact values" case, for a status, a category, or any
 * closed set of options that does not deserve a hand-written schema.
 *
 * `Values` is inferred as a `const` type parameter, so the caller's array
 * literal is read as its literal tuple type without writing `as const` at the
 * call site. The generated schema is built with TypeBox's own `t.Enum`, not a
 * hand-rolled `t.Union` of `t.Literal`s, so it carries the same `[Hint]:
 * "Enum"` tag any other TypeBox-based enum would — the canonical shape,
 * matching the rest of the ecosystem instead of inventing a parallel one. The
 * record's keys are throwaway placeholders (`"value0"`, `"value1"`, …), never
 * the stringified values themselves: `t.Enum` mimics a native TS `enum`'s
 * runtime shape and filters out every **numeric** key (the reverse mapping a
 * numeric enum carries), so a value-derived key like `"1"` would silently
 * drop that entry. A key that can never parse as a number sidesteps the
 * filter regardless of whether the value itself is a string or a number.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam Values - The non-empty tuple of literal values the VO accepts.
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 *
 * @param values - The allowed values, in the order they should be tried as a
 *   fallback default (the first one, when `args.default` is omitted).
 * @param args - Enum-schema options, the demo-mode default, and hooks.
 * @returns The generated enum value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   the placeholder `values[0]`) does not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 *
 * @example
 * ```ts
 * const PostStatus = customEnumVO(["draft", "published", "archived"], {
 * 	default: "draft",
 * 	name: "PostStatus",
 * });
 *
 * const postProperties = { status: PostStatus };
 * ```
 */
export function customEnumVO<
	const Values extends readonly [t.TEnumValue, ...t.TEnumValue[]],
	Sensitive extends boolean = false,
>(
	values: Values,
	args: ICustomValueObjectArgs<Values[number], t.SchemaOptions, Sensitive> = {},
): ValueObjectClassOf<
	Values[number],
	t.TEnum<Record<string, Values[number]>>,
	Sensitive
> {
	const { default: fallback = values[0], options, ...hooks } = args;

	const record = Object.fromEntries(
		values.map((value, index): [string, Values[number]] => [
			`value${index}`,
			value,
		]),
	);

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Enum(record, options),
	});
}
