import { BoundRecord } from "../record";
import type {
	RecordClassOf,
	RecordDefinition,
	RecordPropertiesShapeBase,
} from "../types";

/**
 * Returns a `DomainRecord` base class already bound to a blueprint, so a
 * subclass declares only its domain verbs.
 *
 * `entityOf`'s twin, and it removes the same two pieces of ceremony: the
 * `defineRecord()` method and the `interface X extends RecordAccessorsOf<…> {}`
 * merge — and with the merge, the package's one silent failure mode (skip it
 * and the accessors work but stay invisible to the type system).
 *
 * **Call it once, at module scope**, like every other class factory here. Each
 * call mints a fresh class, so two calls with the same arguments produce
 * classes `instanceof` does not relate.
 *
 * @typeParam PropertiesShape - The blueprint shape.
 *
 * @param properties - The blueprint: one property class per domain property.
 * @param source - Stable record-type identifier, used as the exception `source`.
 * @param extra - The rest of the definition (currently `sensitive`).
 * @returns A base class bound to the blueprint, with typed accessors.
 *
 * @example
 * ```ts
 * const moneyProperties = { amount: IntegerVO, currency: CurrencyVO };
 *
 * class Money extends recordOf(moneyProperties, "money") {
 *   public add(cents: number): void {
 *     this.set("amount", this.amount + cents); // protected members stay reachable
 *   }
 * }
 * ```
 *
 * @see `entityOf` in `@/domain/entity/helpers/entity-of` — the identified counterpart.
 * @see `RecordClassOf` in `../types` — why the return type is annotated.
 */
export function recordOf<
	const PropertiesShape extends RecordPropertiesShapeBase,
>(
	properties: PropertiesShape,
	source: string,
	extra?: Omit<RecordDefinition<PropertiesShape>, "properties" | "source">,
): RecordClassOf<PropertiesShape> {
	class BlueprintRecord extends BoundRecord<PropertiesShape> {
		public static readonly definition: RecordDefinition<PropertiesShape> = {
			...extra,
			properties,
			source,
		};
	}

	// The cast covers the accessors alone: they are installed on the prototype
	// at runtime, which no class declaration can express.
	return BlueprintRecord as unknown as RecordClassOf<PropertiesShape>;
}
