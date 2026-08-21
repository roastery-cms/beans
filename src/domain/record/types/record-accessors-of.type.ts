import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";
import type { RecordReadValueOf } from "./record-read-value-of.type";

/**
 * The read-only accessors a record derives from its blueprint: one property
 * per blueprint key, typed exactly like `get` for that key.
 *
 * The getters are installed on the prototype at runtime regardless; merging
 * this interface is how TypeScript learns about them — declare
 * `interface X extends RecordAccessorsOf<typeof xProperties> {}` next to the
 * class. Skip the line and the accessors still work but stay invisible to the
 * type system. `recordOf` removes the need for the merge entirely.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @example
 * ```ts
 * const moneyProperties = { amount: PositiveIntegerVO };
 *
 * interface Money extends RecordAccessorsOf<typeof moneyProperties> {}
 * class Money extends DomainRecord<typeof moneyProperties> { ... }
 *
 * money.amount; // number — typed by the merge
 * ```
 */
export type RecordAccessorsOf<
	PropertiesShape extends RecordPropertiesShapeBase,
> = {
	readonly [Key in RecordDomainKeys<PropertiesShape>]: RecordReadValueOf<
		PropertiesShape,
		Key
	>;
};
