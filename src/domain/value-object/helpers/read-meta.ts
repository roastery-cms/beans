import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";

/**
 * Invokes an object's `defineMeta`, guarding against the class-field trap.
 *
 * The base calls `this.defineMeta()` **inside** its constructor, because it
 * needs the `model` to validate. A class field's initializer only runs after
 * `super()` returns, so a `protected defineMeta = () => …` would arrive too
 * late and construction would die with `TypeError: this.defineMeta is not a
 * function`. TypeScript cannot reject that (a property may override a method),
 * so the guard is a runtime one — swapping the raw `TypeError` for an
 * exception that explains the initialization order.
 *
 * @typeParam ValueType - Runtime type of the value the VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 * @typeParam Sensitive - Whether the class declared itself sensitive. Defaults
 *   to the **wide** `boolean`, not to `IValueObjectMetadata`'s own `false`:
 *   this is the reading side, and a caller inspecting an unknown class must be
 *   able to compare `meta.sensitive === true` without the compiler ruling the
 *   comparison out as an impossible overlap.
 *
 * @param valueObject - The instance (or probe) expected to implement `defineMeta`.
 * @param source - Identifier for the exception; `"value-object"` when there is no context.
 * @returns The subclass's metadata.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineMeta` is not a
 *   prototype method.
 */
export function readMeta<
	ValueType,
	SchemaType extends t.TSchema,
	Sensitive extends boolean = boolean,
>(
	valueObject: object,
	source: string,
): IValueObjectMetadata<ValueType, SchemaType, Sensitive> {
	const define = (
		valueObject as {
			defineMeta?: () => IValueObjectMetadata<ValueType, SchemaType, Sensitive>;
		}
	).defineMeta;

	if (typeof define !== "function")
		throw new InvalidEntityDefinitionException(
			source,
			"ValueObject: defineMeta must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction.",
		);

	return define.call(valueObject);
}
