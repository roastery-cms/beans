import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryMethodsOf } from "@/domain/repository/types";
import type { SelectedInMemoryNamesOf } from "./selected-in-memory-names-of.type";

/**
 * The union of method names a runtime spec selects — with an empty or omitted
 * spec resolving to the **whole catalog**.
 *
 * That last rule is the deliberate opposite of `RepositoryOf`'s, where an
 * empty selection resolves to `never`. The two are answering different
 * questions. In a port declaration, selecting nothing is a mistake worth
 * failing on. In a test double, `inMemoryRepositoryOf(User, [], handler)` is
 * how a caller reaches the third argument without narrowing the second — so
 * empty has to read as "everything", or the ergonomic path would produce a
 * dummy with no methods.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Spec - The runtime spec, in either form.
 *
 * @example
 * ```ts
 * type A = InMemorySpecNamesOf<typeof User, readonly ["findById", "create"]>;
 * // "findById" | "create"
 *
 * type B = InMemorySpecNamesOf<typeof User, readonly []>;
 * // the full RepositoryMethodsOf<typeof User> catalog
 * ```
 *
 * @see {@link InMemoryRepositorySpecOf} — the forms this collapses.
 */
export type InMemorySpecNamesOf<EntityClass extends AnyEntityClass, Spec> = [
	SelectedInMemoryNamesOf<Spec>,
] extends [never]
	? RepositoryMethodsOf<EntityClass>
	: Extract<SelectedInMemoryNamesOf<Spec>, RepositoryMethodsOf<EntityClass>>;
