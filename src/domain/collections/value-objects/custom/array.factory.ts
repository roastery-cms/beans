import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/** Placeholder default, matching `StringArrayVO` / `UuidArrayVO`. */
const ARRAY_PLACEHOLDER: never[] = [];

/**
 * Builds an array `ValueObject` **class** from a schema for its items plus
 * TypeBox array options (`minItems`, `maxItems`, `uniqueItems`, …).
 *
 * The item schema is a parameter rather than an option because it drives the
 * wrapped type: `customArrayVO(UuidSchema)` produces a VO whose `value` is
 * `string[]`, and one whose blueprint accessor reads back as `string[]` too.
 *
 * Item schemas relying on a custom format (`UuidSchema`, `SlugSchema`, …)
 * need those formats registered. Importing anything from this module's barrel
 * — or from `@roastery/beans/domain/collections/schemas` — does that for you.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam ItemSchema - TypeBox schema validating a single element.
 *
 * @param items - The schema every element must pass.
 * @param args - Array options, demo-mode default, and behaviour hooks.
 * @returns The generated array value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   placeholder `[]`) does not pass the resulting schema; `minItems: 1` with
 *   no declared default is the case that hits this.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 *
 * @example
 * ```ts
 * const AuthorIds = customArrayVO(UuidSchema, {
 * 	options: { minItems: 1, uniqueItems: true },
 * 	default: () => [generateUUID()],
 * 	name: "AuthorIds",
 * });
 *
 * const postProperties = { authors: AuthorIds };
 * ```
 */
export function customArrayVO<ItemSchema extends t.TSchema>(
	items: ItemSchema,
	args: ICustomValueObjectArgs<t.Static<ItemSchema>[], t.ArrayOptions> = {},
): ValueObjectClassOf<t.Static<ItemSchema>[], t.TArray<ItemSchema>> {
	const { default: fallback = ARRAY_PLACEHOLDER, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Array(items, options),
	});
}
