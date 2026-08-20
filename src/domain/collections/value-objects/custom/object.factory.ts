import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/**
 * Builds an object `ValueObject` **class** from a TypeBox properties shape —
 * the "object *with* a schema" case, for a structured value that belongs to
 * one property rather than to a nested entity of its own.
 *
 * `additionalProperties` defaults to `false`, matching how `Entity` emits every
 * level of its aggregate model. Pass `options: { additionalProperties: true }`
 * to opt out.
 *
 * Unlike the other factories, **`default` is required**. There is no
 * placeholder that could satisfy an arbitrary set of required properties, and
 * guessing one would only move the failure to the first `demo()`.
 *
 * For a free-form object with no declared shape, reach for `customRecordVO`.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam Properties - The TypeBox properties shape of the object.
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 *
 * @param properties - Schema per key, as `t.Object` takes them.
 * @param args - Object options, the required demo-mode default, and hooks.
 * @returns The generated object value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the declared default does
 *   not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see `customRecordVO` — the shapeless counterpart.
 *
 * @example
 * ```ts
 * const RoastProfile = customObjectVO(
 * 	{ temperature: t.Number({ minimum: 0 }), minutes: t.Number({ minimum: 0 }) },
 * 	{ default: { temperature: 210, minutes: 12 }, name: "RoastProfile" },
 * );
 *
 * const beanProperties = { profile: RoastProfile };
 * ```
 */
export function customObjectVO<
	Properties extends t.TProperties,
	Sensitive extends boolean = false,
>(
	properties: Properties,
	args: ICustomValueObjectArgs<
		t.Static<t.TObject<Properties>>,
		t.ObjectOptions,
		Sensitive
	> & {
		readonly default:
			| t.Static<t.TObject<Properties>>
			| (() => t.Static<t.TObject<Properties>>);
	},
): ValueObjectClassOf<
	t.Static<t.TObject<Properties>>,
	t.TObject<Properties>,
	Sensitive
> {
	const { default: fallback, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Object(properties, { additionalProperties: false, ...options }),
	});
}
