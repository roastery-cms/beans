import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type {
	RepositoryGroupedSpecOf,
	RepositoryMethodsOf,
} from "@/domain/repository/types";

/**
 * What `inMemoryRepositoryOf` accepts as its second argument: an array of
 * method names, or the same `{ read, write }` object `RepositoryOf` already
 * takes.
 *
 * Both forms are here for the same reason `RepositoryOf` carries both — and
 * with none of the asymmetry. At the type level only the flat union gets
 * editor completions, because TypeScript suggests string literals solely in a
 * direct type-argument position. This is a **value** position, where the
 * contextual type drives suggestions instead: measured against the real
 * LanguageService, `inMemoryRepositoryOf(User, ["…"])` and
 * `inMemoryRepositoryOf(User, { read: ["…"] })` both offer the full catalog.
 *
 * `RepositoryGroupedSpecOf` is reused verbatim rather than redeclared: it was
 * already written as a plain object type, so it is already a valid runtime
 * value shape.
 *
 * An **empty** array (or an omitted argument) means the whole catalog — see
 * {@link InMemorySpecNamesOf} for why that is the opposite of `RepositoryOf`'s
 * own empty-selection rule.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * inMemoryRepositoryOf(User, ["findById", "create"]);
 * inMemoryRepositoryOf(User, { read: ["findById"], write: ["create"] });
 * ```
 *
 * @see `RepositorySpecOf` in `@roastery/beans/domain/repository/types` — the type-level counterpart.
 */
export type InMemoryRepositorySpecOf<EntityClass extends AnyEntityClass> =
	| readonly RepositoryMethodsOf<EntityClass>[]
	| RepositoryGroupedSpecOf<EntityClass>;
