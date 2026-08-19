import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryOf } from "./repository-of.type";
import type { RepositoryReadMethodsOf } from "./repository-read-methods-of.type";

/**
 * The whole read catalog for one entity, with no spec to write: every
 * `findBy*` and `findManyBy*` its blueprint generates, plus `findMany`,
 * `findManyByIds` and `count`.
 *
 * Defined as {@link RepositoryOf} over its own catalog rather than by listing
 * the contracts again — so it cannot drift from the generator, and a new
 * capability added to the pillar lands here for free.
 *
 * Reach for it when an adapter genuinely implements everything (an in-memory
 * repository in a test suite is the usual case). A use case should ask for the
 * `ICan*` capabilities it actually uses instead: the point of the pillar is
 * that a command able to read by email but not to delete says so in its own
 * `Deps`.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * class InMemoryUserReader implements IEntityReader<typeof User> { … }
 * ```
 *
 * @see {@link IEntityWriter} — the write half.
 * @see {@link IEntityRepository} — both halves.
 * @see {@link ReaderOf} — the same half, projected out of an existing repository.
 */
export type IEntityReader<EntityClass extends AnyEntityClass> = RepositoryOf<
	EntityClass,
	RepositoryReadMethodsOf<EntityClass>,
	"read"
>;
