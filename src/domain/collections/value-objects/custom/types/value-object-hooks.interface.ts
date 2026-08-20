import type { RedactionPlaceholder } from "@/shared/redaction/redaction-config";
import type { IValueObjectContext } from "@/domain/value-object/types";

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
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed.
 *   Inferred from the argument, so a factory call needs no ceremony to get it.
 *
 * @see {@link IDefineValueObjectArgs} — the core factory's payload.
 * @see {@link ICustomValueObjectArgs} — the sugar factories' payload.
 */
export interface IValueObjectHooks<
	ValueType,
	Sensitive extends boolean = false,
> {
	/**
	 * Name stamped onto the generated class (`Class.name`), and used as the
	 * `source` of the exception raised when the declared default fails the
	 * schema. Purely diagnostic: the `source` of *validation* errors always
	 * comes from the owning entity, never from here.
	 */
	readonly name?: string;

	/**
	 * Marks the generated class's values as secret, mirroring
	 * `IValueObjectMetadata.sensitive`. A `Command` carrying one replaces the
	 * value in `toJSON()`; an `Entity` carrying one replaces it in
	 * `toString()`, `toSafeJSON()` and Node's inspect output, while `toJSON()`
	 * stays lossless for persistence.
	 *
	 * Passing `true` also **suppresses the key's `findBy`/`findManyBy` methods**
	 * in any `RepositoryOf` derived from a blueprint holding the generated class:
	 * the literal is inferred into `Sensitive` and travels through to the `[Meta]`
	 * slot, which is the only place the type level can read it from.
	 */
	readonly sensitive?: Sensitive;

	/**
	 * Marks the generated class's values as unique across every row of the
	 * aggregate that holds them, mirroring `IValueObjectMetadata.unique`.
	 *
	 * Declarative only: nothing in the domain layer checks it, because
	 * uniqueness is a property of the set of stored rows rather than of any one
	 * value. The repository adapter reads it back through
	 * `uniqueKeysOf(EntityClass)` or `entity.isUnique(key)`.
	 */
	readonly unique?: boolean;

	/**
	 * This class's own replacement value, overriding the package-wide
	 * `configureRedaction({ placeholder })`. A ready value, or a function of
	 * `(value, context)` — receiving the real value is what allows partial
	 * masking (`a***@b.dev`, last four digits) instead of one flat literal. Ignored unless `sensitive` is `true`.
	 */
	readonly redactWith?: RedactionPlaceholder;

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
