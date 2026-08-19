import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { ICanCount } from "./ican-count.interface";
import type { ICanCreate } from "./ican-create.interface";
import type { ICanDelete } from "./ican-delete.interface";
import type { ICanReadMany } from "./ican-read-many.interface";
import type { ICanReadManyByIds } from "./ican-read-many-by-ids.interface";
import type { ICanUpdate } from "./ican-update.interface";
import type { PerKeyRepositoryContractOf } from "./per-key-repository-contract-of.type";

/**
 * Resolves one method name to the `ICan*` contract that declares it — the
 * single dispatch step {@link RepositoryOf} runs over every selected name
 * before fusing the results.
 *
 * The fixed names are matched first, one by one, and everything left falls
 * through to {@link PerKeyRepositoryContractOf}. That order carries weight for
 * `findManyByIds`: a blueprint is free to declare a key literally called
 * `ids`, and the per-key branch would then generate `findManyByIds` as an
 * ordinary collection read taking `(value, page)`. Testing the fixed name
 * first means the batch loader wins the name, which is the reading every
 * caller expects — and the per-key method for such a blueprint is simply not
 * reachable, a collision documented rather than engineered around.
 *
 * `Name` is deliberately unconstrained. It is always instantiated with a
 * member of {@link RepositoryMethodsOf}, but that argument arrives as an
 * `Extract<…>` over a still-generic spec, and a tighter bound would make the
 * compiler prove an assignability it cannot see through — for no gain, since
 * the dispatch below already resolves an unrecognised name to `never`.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Name - The method name to resolve.
 *
 * @see {@link RepositoryOf} — the only consumer.
 */
export type RepositoryContractOf<
	EntityClass extends AnyEntityClass,
	Name,
> = Name extends "count"
	? ICanCount
	: Name extends "create"
		? ICanCreate<EntityClass>
		: Name extends "update"
			? ICanUpdate<EntityClass>
			: Name extends "delete"
				? ICanDelete<EntityClass>
				: Name extends "findMany"
					? ICanReadMany<EntityClass>
					: Name extends "findManyByIds"
						? ICanReadManyByIds<EntityClass>
						: PerKeyRepositoryContractOf<EntityClass, Name>;
