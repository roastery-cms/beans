import type { AnyWrapperClass } from "@/domain/wrapper/types/any-wrapper-class.type";
import type { WrappableClass } from "./wrappable-class.type";

/**
 * What a blueprint value may be: a `ValueObject` class, another `Entity`
 * class, a `DomainRecord` class, or a **multiplicity wrapper** around any of
 * those three. Every conditional in the blueprint type machinery
 * discriminates between the four branches of this union.
 *
 * The four are genuinely disjoint, not merely ordered: `AnyEntity` declares
 * `id: string` and `AnyRecord` declares the identity fields as `?: never`, so
 * neither extends the other; and both `AnyEntityClass` and `AnyRecordClass`
 * declare `readonly wraps?: never`, which no wrapper class can satisfy, while
 * neither declares `wrapperKind` at all. Branch order is therefore a
 * readability choice — write the entity branch first, by convention — rather
 * than a load-bearing one, unlike the `findManyBy…`-before-`findBy…` pair in
 * `PerKeyRepositoryContractOf`.
 *
 * The wrapper branch is nonetheless written **first** everywhere it appears,
 * for a different reason: it is the branch that has to *unwrap* before the
 * other three can say anything useful, so reading it first is what makes each
 * conditional legible.
 *
 * @see {@link PropertiesShapeBase} — the record of these that forms a blueprint.
 * @see `AnyRecord` in `@/domain/record/types` — where the disjunction is documented.
 */
export type AnyPropertyClass = WrappableClass | AnyWrapperClass;
