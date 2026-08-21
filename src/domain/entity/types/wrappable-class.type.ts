import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * What a multiplicity wrapper may wrap: the three **singular** blueprint kinds
 * — a `ValueObject` class, an `Entity` class or a `DomainRecord` class.
 *
 * It exists to break a cycle, not merely to name a subset. Typing
 * `AnyWrapperClass["wraps"]` as {@link AnyPropertyClass} — which includes
 * `AnyWrapperClass` — makes the two types mutually recursive, and TypeScript
 * gives up on it with **TS2589** (`Type instantiation is excessively deep and
 * possibly infinite`) the moment a real blueprint is resolved. Stopping the
 * union one level short removes the recursion outright.
 *
 * That is also the type-level statement of a documented contract:
 * **a wrapper does not wrap a wrapper.** `arrayOf(arrayOf(Tag))` is not part
 * of the package's vocabulary — a list of lists is better modeled as a record
 * with a named verb.
 *
 * @see {@link AnyPropertyClass} — this union plus `AnyWrapperClass`.
 */
export type WrappableClass =
	| AnyValueObjectClass
	| AnyEntityClass
	| AnyRecordClass;
