import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * The **serialized** form of one blueprint property: the return of `toJSON()`
 * for a nested entity, the wrapped `value` for a value-object.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link InputValueOf} — the input-side counterpart, where a nested
 *   entity's identity becomes optional.
 */
export type RawValueOf<Class extends AnyPropertyClass> =
	Class extends AnyEntityClass
		? ReturnType<Class["prototype"]["toJSON"]>
		: Class extends AnyValueObjectClass
			? Class["prototype"]["value"]
			: never;
