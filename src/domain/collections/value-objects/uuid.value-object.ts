import { generateUUID } from "@/domain/entity/helpers";
import { ValueObject } from "@/domain/value-object";
import type {
	IValueObjectContext,
	IValueObjectMetadata,
} from "@/domain/value-object/types";
import { UuidSchema } from "../schemas";

/**
 * UUID value-object. Validates against {@link UuidSchema}.
 *
 * The `meta.default` is a **thunk** — {@link generateUUID} itself (v7,
 * time-sortable), passed by reference. It is only invoked in demo mode, so
 * hydrating an entity with a known id never generates a UUID just to throw it
 * away; and two demo instances receive different ids, which is what identity
 * requires. {@link UuidVO.generate} exposes the same idea by name.
 *
 * @see {@link UuidSchema}
 * @see {@link generateUUID}
 *
 * @example
 * ```ts
 * const context = { name: "id", source: "bean" };
 * new UuidVO("018f5c8e-2e1f-7b3a-8c4d-9a8b7c6d5e4f", context);
 * UuidVO.generate(context); // wraps a fresh v7 UUID
 * ```
 */
export class UuidVO extends ValueObject<string, typeof UuidSchema> {
	/** @returns The UUID schema and the v7 generator as a thunk. */
	protected defineMeta(): IValueObjectMetadata<string, typeof UuidSchema> {
		return { default: generateUUID, schema: UuidSchema };
	}

	/**
	 * Builds a `UuidVO` wrapping a freshly generated v7 UUID — an alias of
	 * {@link ValueObject.demo} that says what it is for.
	 *
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns The wrapped fresh UUID.
	 */
	public static generate(context: IValueObjectContext): UuidVO {
		return UuidVO.demo(context);
	}
}
