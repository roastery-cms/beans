import type { AnyPropertyClass } from "@/domain/entity/types/any-property-class.type";
import type { RawValueOf } from "@/domain/entity/types/raw-value-of.type";

/**
 * The **serialized** form of one record blueprint property: the return of
 * `toJSON()` for a nested entity or record, the wrapped `value` for a
 * value-object.
 *
 * A named alias of `RawValueOf` — serialization asks the same question of a
 * property regardless of which pillar holds it, and a nested entity inside a
 * record still serializes with its identity, exactly as it would anywhere
 * else.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see `InputValueOf` in `@/domain/entity/types` — the input-side counterpart.
 */
export type RecordRawValueOf<Class extends AnyPropertyClass> =
	RawValueOf<Class>;
