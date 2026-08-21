import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * What a blueprint value may be: a `ValueObject` class, another `Entity`
 * class, or a `DomainRecord` class. Every conditional in the blueprint type
 * machinery discriminates between the three branches of this union.
 *
 * The three are genuinely disjoint, not merely ordered: `AnyEntity` declares
 * `id: string` and `AnyRecord` declares the identity fields as `?: never`, so
 * neither extends the other. Branch order is therefore a readability choice —
 * write the entity branch first, by convention — rather than a load-bearing
 * one, unlike the `findManyBy…`-before-`findBy…` pair in
 * `PerKeyRepositoryContractOf`.
 *
 * @see {@link PropertiesShapeBase} — the record of these that forms a blueprint.
 * @see `AnyRecord` in `@/domain/record/types` — where the disjunction is documented.
 */
export type AnyPropertyClass =
	| AnyValueObjectClass
	| AnyEntityClass
	| AnyRecordClass;
