import { ValueObject } from "@/domain/value-object";
import type {
	IValueObjectContext,
	IValueObjectMetadata,
} from "@/domain/value-object/types";
import { BooleanSchema } from "../schemas";

/**
 * Boolean value-object. Validates against {@link BooleanSchema}.
 *
 * Besides the regular constructor, three sugar statics cover the common
 * cases: {@link BooleanVO.truthy}, {@link BooleanVO.falsy} and
 * {@link BooleanVO.from} — the last one coercing any value with `!!`.
 *
 * @see {@link BooleanSchema}
 *
 * @example
 * ```ts
 * const context = { name: "published", source: "post" };
 * new BooleanVO(true, context);
 * BooleanVO.from("yes", context).value; // true
 * BooleanVO.falsy(context).value;       // false
 * ```
 */
export class BooleanVO extends ValueObject<boolean, typeof BooleanSchema> {
	/** @returns The boolean schema and `true` as the demo default. */
	protected defineMeta(): IValueObjectMetadata<boolean, typeof BooleanSchema> {
		return { default: true, schema: BooleanSchema };
	}

	/**
	 * Builds a `BooleanVO` wrapping `true`.
	 *
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns The wrapped `true`.
	 */
	public static truthy(context: IValueObjectContext): BooleanVO {
		return new BooleanVO(true, context);
	}

	/**
	 * Builds a `BooleanVO` wrapping `false`.
	 *
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns The wrapped `false`.
	 */
	public static falsy(context: IValueObjectContext): BooleanVO {
		return new BooleanVO(false, context);
	}

	/**
	 * Coerces any value to its boolean form (`!!value`) and wraps it —
	 * `0`, `""`, `null` and `undefined` become `false`; everything else `true`.
	 *
	 * @param value - Any value to coerce.
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns The wrapped coercion result.
	 */
	public static from(value: unknown, context: IValueObjectContext): BooleanVO {
		return new BooleanVO(!!value, context);
	}
}
