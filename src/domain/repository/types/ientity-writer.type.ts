import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryOf } from "./repository-of.type";
import type { RepositoryWriteMethods } from "./repository-write-methods.type";

/**
 * The whole write catalog for one entity: `create`, `update` and `delete`,
 * each taking the instance and resolving to `void`.
 *
 * Unlike its read counterpart this set does not grow with the blueprint — what
 * a write does is settled by the aggregate's lifecycle, not by its
 * properties — so `IEntityWriter<typeof User>` and `IEntityWriter<typeof Post>`
 * differ only in the instance type they accept.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * class InMemoryUserWriter implements IEntityWriter<typeof User> { … }
 * ```
 *
 * @see {@link IEntityReader} — the read half.
 * @see {@link IEntityRepository} — both halves.
 * @see {@link WriterOf} — the same half, projected out of an existing repository.
 */
export type IEntityWriter<EntityClass extends AnyEntityClass> = RepositoryOf<
	EntityClass,
	RepositoryWriteMethods,
	"write"
>;
