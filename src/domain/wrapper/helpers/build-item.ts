import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { IValueObjectContext } from "@/domain/value-object/types";
import { isBuiltInstance } from "@/shared/helpers/is-built-instance";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";

/**
 * Builds one item of a wrapper from its raw input, applying the **same**
 * per-kind contract `buildProperty` already applies to an unwrapped blueprint
 * key: a value-object takes its value plus the `{ name, source }`
 * identification context, an entity or a record takes a single payload
 * argument.
 *
 * The discriminant is `isValueObjectClass` and not a three-way test, for the
 * reason it is everywhere else in the package: entity and record construct
 * identically, and only a value-object needs the context.
 *
 * **The `source` an item reports is the wrapper's, not the owning
 * aggregate's.** A value-object rejecting an item therefore says
 * `("0", "array-of")` rather than naming the blueprint key it came from —
 * exactly the trade a nested entity already makes, where the exception carries
 * the nested type's own source and the outer path is lost.
 *
 * @param inner - The wrapped blueprint class.
 * @param source - The wrapper's own source, for error context.
 * @param name - This item's name within the wrapper: its index, or `"value"`.
 * @param value - The item's raw input.
 * @returns The built item.
 *
 * @throws `InvalidPropertyException` — when the item fails its own validation.
 */
export function buildItem(
	inner: WrappableClass,
	source: string,
	name: string,
	value: unknown,
): unknown {
	if (!isValueObjectClass(inner)) {
		// Adoption, not reconstruction — see `isBuiltInstance`. This is what
		// makes appending through `set` keep the existing items' identities
		// (and any events they buffered) without a `toJSON()` round trip.
		if (isBuiltInstance(inner, value)) return value;

		return new (inner as unknown as new (payload: never) => unknown)(
			value as never,
		);
	}

	const context: IValueObjectContext = { name, source };

	return new (
		inner as unknown as new (
			value: never,
			context: IValueObjectContext,
		) => unknown
	)(value as never, context);
}
