import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";

/**
 * Whether a blueprint value is a `DomainRecord` class — decided structurally,
 * by the `defineRecord` every record declares and neither a value-object nor
 * an entity does.
 *
 * Structural for the same reason `isEntityClass` and `isValueObjectClass` are:
 * it lets `entity.ts` classify a record, and `record.ts` classify an entity,
 * without either importing the other's class module. That is what keeps the
 * only cycle between the two pillars a function-to-function one (the two
 * `modelFor`s delegating to each other), resolved at call time and never
 * during module evaluation.
 *
 * @param candidate - A blueprint property class.
 * @returns `true` when the class carries a `defineRecord` on its prototype.
 *
 * @see `isEntityClass` in `./is-entity-class` — the sibling predicate.
 */
export function isRecordClass(candidate: unknown): candidate is AnyRecordClass {
	return (
		typeof candidate === "function" &&
		typeof (candidate.prototype as { defineRecord?: unknown } | undefined)
			?.defineRecord === "function"
	);
}
