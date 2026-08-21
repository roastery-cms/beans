import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyWrapperClass } from "@/domain/wrapper/types/any-wrapper-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * Base constraint of every `Command` blueprint: a plain object mapping each
 * input field to its `ValueObject` class, its `DomainRecord` class, or a
 * multiplicity wrapper (`arrayOf` / `optionalOf` / `nullableOf`) around any
 * blueprint class.
 *
 * It never accepts a nested `Entity` (or `Command`) class **directly** — a
 * command's input is a payload, not an aggregate root, and nothing about
 * `execute()` would know what to do with an identified entity handed in from
 * outside. A `DomainRecord` is a different case: it is a composite *value*
 * with verbs, exactly the shape an input field sometimes wants, and admitting
 * it is what lets a command take a `Money` or an `Address` without flattening
 * it into a `customObjectVO`.
 *
 * Two consequences worth stating, because the previous VO-only rule made both
 * impossible:
 *
 * - **A record blueprint may itself hold an entity**, so a command payload can
 *   reach one transitively. That is the caller's modeling decision, not
 *   something this constraint tries to prevent.
 * - **There is now a cycle to guard against.** A blueprint of value-objects
 *   alone cannot reference itself; one that admits records can. The guard is
 *   not reimplemented here — this pillar delegates schema derivation and
 *   construction into the record pillar for a record-valued key, and the
 *   record pillar's own `deriving`/`constructing` sets catch the cycle.
 *
 * **A wrapper is admitted, including one around an `Entity`, and that is an
 * asymmetry rather than an oversight.** `user: UserEntity` stays a compile
 * error while `users: arrayOf(UserEntity)` compiles, so the rule above is
 * reachable around rather than through. It is stated here explicitly so it
 * does not read as something forgotten: a wrapper is a multiplicity, it makes
 * no judgment about what it holds, and adding an entity-shaped exception to it
 * would give the wrapper a second job — knowing which pillar is asking. The
 * transitive reach is in any case already open, since a record blueprint may
 * hold an entity.
 *
 * @example
 * ```ts
 * const createOrderProperties = { email: EmailVO, total: Money, tags: arrayOf(TagVO) };
 * ```
 *
 * @see `AnyRecordClass` in `@/domain/record/types` — one of the branches this admits.
 * @see `AnyWrapperClass` in `@/domain/wrapper/types` — the other.
 */
export type CommandPropertiesShapeBase = Record<
	string,
	AnyValueObjectClass | AnyRecordClass | AnyWrapperClass
>;
