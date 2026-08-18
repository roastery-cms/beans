import { ValueObject } from "@/domain/value-object";
import type {
	IValueObjectContext,
	IValueObjectMetadata,
} from "@/domain/value-object/types";
import { DateTimeSchema } from "../schemas";

/**
 * ISO 8601 timestamp value-object. Validates against {@link DateTimeSchema}.
 *
 * The `meta.default` is the **thunk** `() => new Date().toISOString()`, not a
 * ready timestamp: `defineMeta` runs on every construction, so a ready value
 * would be computed even when a real date is given and thrown away. The thunk
 * is only invoked in demo mode, and there each instance carries the instant it
 * was born — which is what a `createdAt` should do. {@link DateTimeVO.now}
 * exposes the same idea by name.
 *
 * @see {@link DateTimeSchema}
 *
 * @example
 * ```ts
 * const context = { name: "createdAt", source: "bean" };
 * new DateTimeVO("2026-08-07T10:00:00.000Z", context);
 * DateTimeVO.now(context); // wraps the current instant
 * ```
 */
export class DateTimeVO extends ValueObject<string, typeof DateTimeSchema> {
	/** @returns The ISO 8601 schema and a thunk returning the current instant. */
	protected defineMeta(): IValueObjectMetadata<string, typeof DateTimeSchema> {
		return { default: () => new Date().toISOString(), schema: DateTimeSchema };
	}

	/**
	 * Builds a `DateTimeVO` wrapping the current instant — an alias of
	 * {@link ValueObject.demo} that says what it is for.
	 *
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns The wrapped current timestamp.
	 */
	public static now(context: IValueObjectContext): DateTimeVO {
		return DateTimeVO.demo(context);
	}
}
