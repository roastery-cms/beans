import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { UuidArraySchema } from "../schemas";

/**
 * Array-of-UUIDs value-object. Validates against {@link UuidArraySchema} —
 * every element must be a UUID; an empty array is valid.
 *
 * @see {@link UuidArraySchema}
 *
 * @example
 * ```ts
 * new UuidArrayVO([id1, id2], { name: "authorIds", source: "post" });
 * UuidArrayVO.demo({ name: "authorIds", source: "post" }).value; // []
 * ```
 */
export class UuidArrayVO extends ValueObject<string[], typeof UuidArraySchema> {
	/** @returns The UUID-array schema and an empty array as demo default. */
	protected defineMeta(): IValueObjectMetadata<
		string[],
		typeof UuidArraySchema
	> {
		return { default: [], schema: UuidArraySchema };
	}
}
