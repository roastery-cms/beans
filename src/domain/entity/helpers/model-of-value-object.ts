import { metaOf } from "@/domain/value-object/helpers";
import type { t } from "@roastery/terroir";
import type { AnyValueObjectClass } from "../types/any-value-object-class.type";

/**
 * Reads the TypeBox model of a `ValueObject` class without constructing any
 * instance, via {@link metaOf}.
 *
 * @param valueObjectClass - The value-object class from a blueprint.
 * @returns The TypeBox schema the class declares in its `defineMeta`.
 */
export function modelOfValueObject(
	valueObjectClass: AnyValueObjectClass,
): t.TSchema {
	return metaOf(valueObjectClass).schema;
}
