import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";

/**
 * Whether a blueprint value is an `Entity` class — decided structurally, by
 * the `defineEntity` every entity declares and neither a value-object nor a
 * record does.
 *
 * Structural rather than `prototype instanceof Entity` for the same reason
 * {@link isValueObjectClass} is: reaching for the `Entity` class from a shared
 * module (or from the record pillar) would create an import cycle whose far
 * end is a `class BoundEntity extends Entity` evaluated at module load — the
 * exact shape that produces `ReferenceError: Cannot access 'Entity' before
 * initialization`. Testing a prototype method needs no class at all, so the
 * record pillar can classify an entity without importing one.
 *
 * `defineEntity` being `protected` does not interfere: `protected` is a
 * compile-time notion only, and the method is an ordinary own property of the
 * prototype at runtime — the same thing `isValueObjectClass` relies on for
 * `defineMeta`.
 *
 * Accepted cost, identical to `isValueObjectClass`'s: a class that declares
 * `defineEntity` without descending from `Entity` is misclassified and fails
 * deeper. No pillar guards against a use outside its stated contract.
 *
 * @param candidate - A blueprint property class.
 * @returns `true` when the class carries a `defineEntity` on its prototype.
 *
 * @see `isRecordClass` in `./is-record-class` — the sibling predicate.
 */
export function isEntityClass(candidate: unknown): candidate is AnyEntityClass {
	return (
		typeof candidate === "function" &&
		typeof (candidate.prototype as { defineEntity?: unknown } | undefined)
			?.defineEntity === "function"
	);
}
