import type { t } from "@roastery/terroir";
import type { IValueObjectHooks } from "./value-object-hooks.interface";

/**
 * Payload of the core `defineValueObject` factory: a ready TypeBox schema, the
 * demo-mode default, and the optional behaviour hooks.
 *
 * Unlike the sugar factories, `default` is **required** here. There is no
 * placeholder a generic factory could invent for an arbitrary schema — and the
 * package cannot reach TypeBox's `Value.Create`, since `@roastery/terroir`
 * re-exports only the root `@sinclair/typebox` module. Declaring the default is
 * the honest alternative to guessing one that the schema then rejects.
 *
 * @typeParam ValueType - Runtime type of the value the generated VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed.
 *
 * @see {@link ICustomValueObjectArgs} — the sugar counterpart, where `default`
 *   becomes optional because each factory knows a placeholder for its kind.
 *
 * @example
 * ```ts
 * defineValueObject({
 * 	schema: EmailSchema,
 * 	default: "user@example.com",
 * 	validate: (value) => value.endsWith("@roastery.dev"),
 * });
 * ```
 */
export interface IDefineValueObjectArgs<
	ValueType,
	SchemaType extends t.TSchema,
	Sensitive extends boolean = false,
> extends IValueObjectHooks<ValueType, Sensitive> {
	/**
	 * Demo-mode fallback: a ready value, or a thunk for expensive defaults.
	 *
	 * A ready value is validated **eagerly**, inside the factory call. A thunk
	 * is trusted there — evaluating it would defeat its whole purpose — and is
	 * validated by the base at demo time, like any other value.
	 */
	readonly default: ValueType | (() => ValueType);

	/**
	 * The schema every wrapped value must pass. Build it **once**, outside any
	 * hot path: validators are compiled and cached against the schema's object
	 * identity, so a schema rebuilt per call recompiles every time.
	 */
	readonly schema: SchemaType;
}
