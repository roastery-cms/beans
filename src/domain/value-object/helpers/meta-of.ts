import type {
	IValueObjectMetadata,
	ValueObjectClassLike,
} from "@/domain/value-object/types";
import type { t } from "@roastery/terroir";
import { readMeta } from "./read-meta";

/**
 * Reads the metadata of a `ValueObject` **class** without constructing any
 * instance: builds a probe with `Object.create` and calls the `defineMeta`
 * living on the prototype.
 *
 * This is what lets `Entity` derive its aggregate schema from a blueprint
 * without instantiating one VO per property — and, as a consequence, without
 * the derivation depending on the `meta.default` being valid. It only works
 * because `defineMeta` is **pure** by contract: it returns a literal, without
 * looking at instance state.
 *
 * @typeParam ValueType - Runtime type of the value the VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 *
 * @param valueObjectClass - The `ValueObject` class to inspect.
 * @returns The `{ default, schema }` the class declares.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineMeta` is not a
 *   prototype method.
 */
export function metaOf<ValueType, SchemaType extends t.TSchema>(
	valueObjectClass: ValueObjectClassLike,
): IValueObjectMetadata<ValueType, SchemaType> {
	return readMeta<ValueType, SchemaType>(
		Object.create(valueObjectClass.prototype) as object,
		"value-object",
	);
}
