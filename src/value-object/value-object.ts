import type { IValueObjectMetadata } from "@/value-object/types";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { Schema } from "@roastery/terroir/schema";
import type { t } from "@roastery/terroir";

/**
 * Immutable, validated wrapper around a primitive (or array) value.
 *
 * Subclasses must:
 * 1. Provide a concrete {@link ValueObject.schema} (a `Schema` instance built from a TypeBox DTO).
 * 2. Keep their constructor `protected` and expose a `static make(value, info)` factory
 *    that calls {@link ValueObject.validate} after `new` and before returning the instance.
 *
 * The base does **not** validate eagerly: validation timing is deferred to subclass factories
 * so that derived constructors can apply transformations (e.g. `slugify(value)`) before the
 * value is checked against the schema.
 *
 * @typeParam ValueType - Runtime type of the wrapped value (e.g. `string`, `boolean`, `string[]`).
 *   Unconstrained — any type the corresponding schema can describe is allowed.
 * @typeParam SchemaType - The TypeBox schema type that validates `ValueType`. Constrained to
 *   {@link t.TSchema}; flows into the {@link ValueObject.schema} field type.
 *
 * @see {@link IValueObjectMetadata} for the `info` payload the constructor consumes.
 * @see {@link InvalidPropertyException} thrown by {@link ValueObject.validate} on schema mismatch.
 *
 * @example
 * ```ts
 * import { ValueObject } from "@roastery/beans";
 * import { StringSchema, StringDTO } from "@roastery/beans/collections";
 *
 * class FullName extends ValueObject<string, typeof StringDTO> {
 *   protected override readonly schema = StringSchema;
 *
 *   public static make(value: string, info: IValueObjectMetadata): FullName {
 *     const vo = new FullName(value, info);
 *     vo.validate();
 *     return vo;
 *   }
 * }
 * ```
 */
export abstract class ValueObject<ValueType, SchemaType extends t.TSchema> {
	/**
	 * Validation schema for the wrapped value. Subclasses bind this to a concrete `Schema`
	 * instance from `@roastery/terroir/schema` (typically `XSchema = Schema.make(XDTO)`).
	 */
	protected abstract readonly schema: Schema<SchemaType>;

	/**
	 * Builds the immutable wrapper. **Not callable from outside the class hierarchy** —
	 * subclasses must funnel construction through a `static make(...)` factory so that
	 * {@link ValueObject.validate} runs before the instance escapes.
	 *
	 * @param value - The wrapped value. Stored as `public readonly`, so consumers
	 *   read `vo.value` directly.
	 * @param info - Identification context (`name`, `source`) used by
	 *   {@link InvalidPropertyException} to build human-readable error messages.
	 */
	protected constructor(
		public readonly value: ValueType,
		protected readonly info: IValueObjectMetadata,
	) {}

	/**
	 * Runs the schema against {@link ValueObject.value} and throws if validation fails.
	 *
	 * Designed as a side-effect method (returns `void`, not `boolean`) so that callers
	 * cannot accidentally swallow a validation miss — invalid values must propagate as
	 * exceptions, never as silent falsy returns.
	 *
	 * @throws {@link InvalidPropertyException} when `this.schema.match(this.value)` is `false`.
	 *   The exception carries `info.name` and `info.source` so the caller can locate
	 *   which property of which entity failed.
	 */
	protected validate(): void {
		if (!this.schema.match(this.value))
			throw new InvalidPropertyException(this.info.name, this.info.source);
	}
}
