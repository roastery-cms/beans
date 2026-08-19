import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryMethodsOf } from "./repository-methods-of.type";
import type { RepositoryOf } from "./repository-of.type";

/**
 * Everything the pillar can generate for one entity — {@link IEntityReader}
 * and {@link IEntityWriter} together, with no spec to write.
 *
 * The widest port in the pillar, and therefore the one to reach for least
 * often: a dependency typed as this can do anything to the aggregate, which is
 * exactly what a spec'd {@link RepositoryOf} exists to avoid. It earns its
 * place for the adapter that really does implement the lot, and as the input
 * {@link ReaderOf}/{@link WriterOf} project out of.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * class InMemoryUserRepository implements IEntityRepository<typeof User> { … }
 *
 * type Reads = ReaderOf<IEntityRepository<typeof User>>; // ≡ IEntityReader<typeof User>
 * ```
 *
 * @see {@link RepositoryOf} — the spec'd form, which is the normal one.
 */
export type IEntityRepository<EntityClass extends AnyEntityClass> =
	RepositoryOf<EntityClass, RepositoryMethodsOf<EntityClass>>;
