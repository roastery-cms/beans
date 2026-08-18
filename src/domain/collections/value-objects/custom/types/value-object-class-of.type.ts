import type { ValueObject } from "@/domain/value-object";
import type { IValueObjectContext } from "@/domain/value-object/types";
import type { t } from "@roastery/terroir";

/**
 * The **class** a custom value-object factory returns — not an instance.
 *
 * Every factory annotates its return type with this alias, and that annotation
 * is load-bearing: the class it returns is declared *inside* the factory body,
 * so without a named public type the declaration build fails with TS4060
 * (`Return type of exported function has or is using private name`). The
 * package emits declarations (`tsconfig.build.json` sets `declaration: true`
 * and `bun run build` runs `tsup --dts`), so an inferred return type would
 * simply not compile.
 *
 * The shape satisfies the entity pillar's `AnyValueObjectClass`, so a class
 * produced by a factory drops straight into a blueprint. Keeping `SchemaType`
 * as a parameter is what lets `SchemaOf` recover the exact TypeBox schema
 * through its `ValueObject<unknown, infer SchemaType>` conditional.
 *
 * @typeParam ValueType - Runtime type of the value the generated VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 *
 * @see `defineValueObject` — the core factory returning this shape.
 * @see `AnyValueObjectClass` in `@roastery/beans/domain/entity/types` — the blueprint contract it satisfies.
 *
 * @example
 * ```ts
 * const Title: ValueObjectClassOf<string, t.TString> = customStringVO({
 * 	options: { minLength: 4 },
 * 	default: "title",
 * });
 *
 * new Title("A Cool Post", { name: "title", source: "post" }).value;
 * ```
 */
export type ValueObjectClassOf<ValueType, SchemaType extends t.TSchema> = {
	/** Instance side, kept precise so `RawValueOf` and `SchemaOf` stay exact. */
	readonly prototype: ValueObject<ValueType, SchemaType>;

	/** Mirrors the base constructor: a value plus the identification context. */
	new (
		value: ValueType,
		context: IValueObjectContext,
	): ValueObject<ValueType, SchemaType>;

	/**
	 * Inherited from the base: builds the VO from its declared default.
	 *
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns An instance built from `meta.default`.
	 */
	demo(context: IValueObjectContext): ValueObject<ValueType, SchemaType>;
};
