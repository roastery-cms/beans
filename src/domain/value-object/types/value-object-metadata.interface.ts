import type { RedactionPlaceholder } from "@/shared/redaction/redaction-config";
import type { t } from "@roastery/terroir";

/**
 * What a `ValueObject` **is**: the schema that validates its values and the
 * default it falls back to in demo mode. This is what a subclass's
 * `defineMeta()` returns, and what the base stores under the `Meta` symbol.
 *
 * Two rules bind the pair together:
 *
 * - **`default` must pass `model`.** The base validates the default like any
 *   other value, so an invalid default makes `demo()` throw — and breaks the
 *   schema of any entity whose blueprint includes the class.
 * - **`default` may be a thunk, and should be whenever it is expensive.**
 *   `defineMeta()` runs on every construction, so a computed value would be
 *   evaluated even when a real value is given and the default thrown away; a
 *   thunk is only invoked in demo mode. Note the base does **not** run
 *   `transform` over defaults — declare them already in canonical form.
 *
 * @typeParam ValueType - Runtime type of the value the VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 *
 * @example
 * ```ts
 * protected defineMeta(): IValueObjectMetadata<string, typeof UuidDTO> {
 *   return { default: generateUUID, schema: UuidSchema };
 * }
 * ```
 */
export interface IValueObjectMetadata<ValueType, SchemaType extends t.TSchema> {
	/** Demo-mode fallback: a ready value, or a thunk for expensive defaults. */
	readonly default: ValueType | (() => ValueType);

	/** Compiled schema every wrapped value (defaults included) must pass. */
	readonly schema: SchemaType;

	/**
	 * Marks the wrapped value as secret, so it never reaches a log. Travels
	 * with the class: a `PasswordVO` is sensitive in every blueprint that uses
	 * it, without each of them having to say so.
	 *
	 * What this actually suppresses differs by pillar, and the split is the
	 * point. `Command.toJSON()` replaces the value — a command is never
	 * persisted, so there is no round-trip to preserve, and `toJSON` is exactly
	 * what a structured logger reaches through `JSON.stringify`.
	 * `Entity.toJSON()` does **not**: it is the persistence contract and has to
	 * close the loop with `fromJSON`. Both pillars redact in `toString()` and
	 * in Node's inspect output, which is where an entity leaks by accident.
	 *
	 * @see {@link IValueObjectMetadata.redactWith} — what it is replaced with.
	 */
	readonly sensitive?: boolean;

	/**
	 * Marks the wrapped value as unique across every row of the aggregate that
	 * holds it. Travels with the class, exactly as
	 * {@link IValueObjectMetadata.sensitive} does: an `ExternalIdVO` is unique
	 * in every blueprint that uses it, without each of them saying so.
	 *
	 * **Nothing in the domain layer enforces this, and nothing can.** Uniqueness
	 * is a property of the *set* of rows, which only the persistence adapter
	 * ever sees — a `ValueObject` validates one value, an `Entity` validates one
	 * aggregate, and neither has a way to know what else was stored. So
	 * construction never fails because of this flag; it is a declaration the
	 * repository port's implementer reads and honours, through
	 * `uniqueKeysOf(EntityClass)` or `entity.isUnique(key)`.
	 *
	 * Ignored by `Command`: a command is never persisted, so there is no set of
	 * rows for the flag to mean anything against.
	 *
	 * @see `uniqueKeysOf` in `@roastery/beans/domain/entity/helpers` — reads it
	 *   off a whole blueprint.
	 */
	readonly unique?: boolean;

	/**
	 * This class's own replacement value, overriding the package-wide
	 * `configureRedaction({ placeholder })`. A ready value, or a function of
	 * `(value, context)` — receiving the real value is what allows partial
	 * masking (`a***@b.dev`, last four digits) instead of one flat literal.
	 *
	 * Ignored unless {@link IValueObjectMetadata.sensitive} is `true`.
	 */
	readonly redactWith?: RedactionPlaceholder;
}
