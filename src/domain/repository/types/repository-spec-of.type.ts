import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryGroupedSpecOf } from "./repository-grouped-spec-of.type";
import type { RepositoryMethodsOf } from "./repository-methods-of.type";

/**
 * Everything {@link RepositoryOf} accepts as a spec: a union of method names,
 * or the grouped `{ read, write }` object.
 *
 * One constraint holding both forms, rather than two entry points. The
 * completion service flattens a union constraint and offers suggestions for
 * its string-literal members while ignoring the non-literal ones — which is
 * why allowing the object here costs the flat form nothing: writing
 * `RepositoryOf<typeof User, "` still lists the whole catalog.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @see {@link RepositoryMethodsOf} — the flat form.
 * @see {@link RepositoryGroupedSpecOf} — the grouped form.
 */
export type RepositorySpecOf<EntityClass extends AnyEntityClass> =
	| RepositoryMethodsOf<EntityClass>
	| RepositoryGroupedSpecOf<EntityClass>;
