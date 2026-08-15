import type { IValueObjectContext } from "@/value-object/types";

/**
 * The behaviour hooks every custom value-object factory accepts, shared by the
 * core `defineValueObject` and by each sugar factory built on top of it.
 *
 * Both hooks are plain functions, not methods on a subclass: the factory wires
 * them into the generated class's `transform` / `validate` overrides. They are
 * therefore closed over the factory call, and `this` is never bound to the
 * instance — everything a hook needs arrives through its parameters.
 *
 * @typeParam ValueType - Runtime type of the value the generated VO wraps.
 *
 * @see {@link IDefineValueObjectArgs} — the core factory's payload.
 * @see {@link ICustomValueObjectArgs} — the sugar factories' payload.
 */
export interface IValueObjectHooks<ValueType> {
	/**
	 * Name stamped onto the generated class (`Class.name`), and used as the
	 * `source` of the exception raised when the declared default fails the
	 * schema. Purely diagnostic: the `source` of *validation* errors always
	 * comes from the owning entity, never from here.
	 */
	readonly name?: string;

	/**
	 * Normalises the value before validation, mirroring `ValueObject.transform`.
	 * It does **not** run over `default` — declare defaults already in canonical
	 * form.
	 *
	 * @param value - The raw value received by the constructor.
	 * @returns The normalised value, which will be validated and stored.
	 */
	transform?(value: ValueType): ValueType;

	/**
	 * Extra domain rule, run **after** the schema has already accepted the
	 * transformed value. Returning `false` makes the generated class throw
	 * `InvalidPropertyException` carrying the context's `name` and `source`, so
	 * a failed rule is indistinguishable from a failed schema to the caller.
	 *
	 * Throwing from inside works too, and propagates untouched — reach for it
	 * when the rule deserves a more specific exception than "invalid property".
	 *
	 * @param value - The transformed, schema-valid value.
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns `true` when the value satisfies the rule.
	 */
	validate?(value: ValueType, context: IValueObjectContext): boolean;
}
