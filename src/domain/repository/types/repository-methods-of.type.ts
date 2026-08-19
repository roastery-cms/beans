import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryReadMethodsOf } from "./repository-read-methods-of.type";
import type { RepositoryWriteMethods } from "./repository-write-methods.type";

/**
 * The full catalog for one entity: every read method its blueprint generates,
 * plus the three writes.
 *
 * This is the flat spec form of {@link RepositoryOf} — pass a union of these
 * directly as the second type argument and the editor offers completions for
 * every member, removing the ones already written.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type UserRepository = RepositoryOf<typeof User, "findById" | "findByEmail" | "create">;
 * //                                              ^ completions come from this type
 * ```
 *
 * @see {@link RepositoryReadMethodsOf} — the blueprint-derived half.
 * @see {@link RepositoryWriteMethods} — the fixed half.
 * @see {@link RepositorySpecOf} — this union, plus the grouped object form.
 */
export type RepositoryMethodsOf<EntityClass extends AnyEntityClass> =
	| RepositoryReadMethodsOf<EntityClass>
	| RepositoryWriteMethods;
