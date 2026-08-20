import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryContractOf } from "./repository-contract-of.type";
import type { RepositoryExtraMethodsBase } from "./repository-extra-methods-base.type";
import type { RepositorySuppressedNamesOf } from "./repository-suppressed-names-of.type";
import type { RepositoryMode } from "./repository-mode.type";
import type { RepositorySpecOf } from "./repository-spec-of.type";
import type { SelectedRepositoryMethodsOf } from "./selected-repository-methods-of.type";
import type { UnionToIntersection } from "./union-to-intersection.type";
import type { WithRepositoryExtras } from "./with-repository-extras.type";

/**
 * Builds a repository port for one entity, from a spec of the methods it
 * needs — the entry point of the `repository` pillar.
 *
 * The catalog a spec is checked against is **derived from the blueprint**:
 * `findByEmail` is offered because the entity declares `email`, its argument
 * is `string` because that key is an `EmailVO`, and both disappear the moment
 * the key is renamed. That is the whole difference from a hand-written port,
 * which agrees with the model only until someone forgets to update it.
 *
 * Nothing here runs. The pillar is type-only — no factory, no symbol, no
 * runtime, not one byte emitted. `toJSON`/`fromJSON` remain the persistence
 * boundary, and what sits on the other side of these methods is still yours to
 * write.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Spec - Which methods to include, flat or grouped ({@link RepositorySpecOf}).
 * @typeParam Mode - Which half to keep; defaults to both ({@link RepositoryMode}).
 * @typeParam Extras - Extra methods to fold in verbatim ({@link RepositoryExtraMethodsBase}).
 *
 * @example
 * ```ts
 * import { entityOf } from "@roastery/beans/way";
 * import { EmailVO, StringVO } from "@roastery/beans/way/collections/value-objects";
 * import type { RepositoryOf } from "@roastery/beans/domain/repository/types";
 *
 * const userProperties = { name: StringVO, email: EmailVO };
 * class User extends entityOf(userProperties, "user") {}
 *
 * // Flat form — this is the one with editor completions
 * type UserRepository = RepositoryOf<
 *   typeof User,
 *   "findById" | "findByEmail" | "findMany" | "create" | "update"
 * >;
 *
 * // Grouped form — same type, read/write split visible
 * type SameRepository = RepositoryOf<typeof User, {
 *   read: ["findById", "findByEmail", "findMany"];
 *   write: ["create", "update"];
 * }>;
 *
 * // Read-only projection, plus a method no blueprint could generate
 * type UserReader = RepositoryOf<
 *   typeof User,
 *   "findById" | "findByEmail",
 *   "read",
 *   { findByEmailDomain(domain: string, page: RepositoryPageOf<typeof User>): Promise<readonly User[]> }
 * >;
 *
 * class PrismaUserRepository implements UserRepository {
 *   async findById(value: string): Promise<User | null> { … }
 *   async findByEmail(value: string): Promise<User | null> { … }
 *   async findMany(page: RepositoryPageOf<typeof User>): Promise<readonly User[]> { … }
 *   async create(entity: User): Promise<void> { … }
 *   async update(entity: User): Promise<void> { … }
 * }
 * ```
 *
 * Key rules:
 *
 * - **Only the flat spec form gets completions.** `RepositoryOf<typeof User, "`
 *   lists the whole catalog and drops the names already written; the grouped
 *   form's `read: ["…"]` offers nothing, because TypeScript suggests string
 *   literals only in a direct type-argument position. Both forms reject a wrong
 *   name with `TS2344` naming the literal, and hovering
 *   {@link RepositoryReadMethodsOf} expands the catalog by hand.
 * - **`Extras` is the escape hatch, and it is unchecked.** Whatever object type
 *   it names is intersected in as written — `beans` cannot derive
 *   `findByEmailDomain` from a blueprint, so it does not pretend to validate
 *   it. It is also the last parameter, so reaching it with the default mode
 *   means spelling that mode out: `RepositoryOf<typeof User, Spec,
 *   RepositoryMode, Extras>`.
 * - **An empty selection resolves to `never`, on purpose.** Asking for the
 *   write half of a read-only spec is a mistake, and `never` in a `Deps` slot
 *   makes it a compile error at the call site. The alternative —
 *   `UnionToIntersection`'s own `unknown` for an empty union — would satisfy
 *   any dependency record and switch the constraint off silently. An `Extras`
 *   given alongside still survives on its own.
 * - **The result is a named intersection, not a flattened object.** Hover shows
 *   `ICanReadBy<typeof User, "email"> & ICanCreate<typeof User>`, which says
 *   *which capabilities* the port carries. Flattening it would also turn method
 *   shorthand into function properties, quietly trading TypeScript's method
 *   bivariance for strict contravariance.
 * - **Variance is mixed, and stays visible.** The fixed-name contracts are
 *   interfaces with method shorthand (bivariant parameters, TypeScript's
 *   deliberate carve-out); the per-key ones are mapped types, which can only
 *   declare function properties (strictly contravariant). A mapped type cannot
 *   emit a method, so this is not a choice to be made differently — only one to
 *   be documented.
 * - **A class implements the result directly.** `class PrismaUserRepository
 *   implements RepositoryOf<…>` is the intended shape; the port is what the
 *   adapter satisfies and what a use case asks for a slice of, through the
 *   `ICan*` contracts it is built from.
 *
 * @see {@link RepositorySpecOf} — everything the spec accepts.
 * @see {@link IEntityRepository} — the whole catalog, without a spec.
 * @see {@link ReaderOf} — the read/write split as a projection instead of a parameter.
 */
export type RepositoryOf<
	EntityClass extends AnyEntityClass,
	Spec extends RepositorySpecOf<EntityClass>,
	Mode extends RepositoryMode = RepositoryMode,
	Extras extends RepositoryExtraMethodsBase & {
		[Name in RepositorySuppressedNamesOf<EntityClass>]?: never;
	} = Record<never, never>,
> = WithRepositoryExtras<
	[SelectedRepositoryMethodsOf<EntityClass, Spec, Mode>] extends [never]
		? never
		: UnionToIntersection<
				RepositoryContractOf<
					EntityClass,
					SelectedRepositoryMethodsOf<EntityClass, Spec, Mode>
				>
			>,
	Extras
>;
