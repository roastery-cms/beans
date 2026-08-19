import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryReadMethodsOf } from "./repository-read-methods-of.type";
import type { RepositoryWriteMethods } from "./repository-write-methods.type";

/**
 * The grouped spec form: `{ read: [...], write: [...] }`, both halves
 * optional.
 *
 * Resolves to exactly the same repository as the flat union form — the two are
 * mutually assignable, and neither is the "real" one. Pick this when the port
 * is long enough that seeing the read/write split at a glance is worth
 * something; pick the flat form while writing it.
 *
 * **This form gets no editor completions, and that is a compiler limitation,
 * not a design choice.** TypeScript offers string-literal suggestions only for
 * a literal in a *direct* type-argument position; a literal nested inside a
 * tuple inside a type literal is not one, so the editor has nothing to offer
 * inside `read: ["…"]`. A wrong name is still rejected the moment it is
 * written — `TS2344`, naming the offending literal — and hovering
 * {@link RepositoryReadMethodsOf} expands the whole catalog, which is the
 * fallback for discovering what is available here.
 *
 * Both halves accept a mutable tuple, a `readonly` tuple, or an array of the
 * union — {@link RepositorySpecNamesOf} reads them through `infer`, so no
 * `as const` is needed.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * type UserRepository = RepositoryOf<typeof User, {
 *   read: ["findById", "findByEmail"];
 *   write: ["create", "update", "delete"];
 * }>;
 * ```
 *
 * @see {@link RepositoryMethodsOf} — the flat form, which does get completions.
 * @see {@link RepositorySpecOf} — the union of both forms.
 */
export type RepositoryGroupedSpecOf<EntityClass extends AnyEntityClass> = {
	readonly read?: readonly RepositoryReadMethodsOf<EntityClass>[];
	readonly write?: readonly RepositoryWriteMethods[];
};
