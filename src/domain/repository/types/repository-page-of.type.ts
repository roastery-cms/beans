import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { PropertiesOfClass } from "@/domain/entity/types/properties-of-class.type";
import type { RepositoryOrderKeysOf } from "./repository-order-keys-of.type";

/**
 * The window a collection read is limited to: which page, how many rows that
 * page holds, and **in what order**.
 *
 * All four fields are required, on purpose, and for two different reasons.
 *
 * `page`/`perPage`: every method in this pillar that can return more than one
 * row takes one of these, so an unbounded `SELECT *` is not expressible
 * through a generated port — a contract that lets a caller forget the limit is
 * a contract that will eventually be called without one. `beans` declares no
 * default page size either: what a sane `perPage` is belongs to the
 * application, not to a library that cannot know the row width, the transport,
 * or the read pattern.
 *
 * `orderBy`/`direction`: a page is a slice, and a slice of an unordered set is
 * indeterminate. Two calls for page 1 and page 2 against a table taking writes
 * can return the same row twice, or skip one entirely, and nothing in the types
 * would have said so. The in-memory double hides this — a `Map` preserves
 * insertion order — while Postgres reveals it, which is the worst possible
 * split. Requiring the order makes the caller decide once, in the same place
 * they already decide the page size.
 *
 * The orderable keys are **not** the filterable ones: see
 * {@link RepositoryOrderKeysOf} for why an array- or object-valued key is
 * filterable but not orderable.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @example
 * ```ts
 * await users.findManyByName("alan", {
 * 	page: 1,
 * 	perPage: 20,
 * 	orderBy: "createdAt",
 * 	direction: "desc",
 * });
 * ```
 *
 * @see {@link RepositoryOrderKeysOf} — where `orderBy`'s keys come from.
 * @see {@link ICanReadMany} — the unfiltered collection read.
 * @see {@link ICanReadManyBy} — the per-key collection read.
 */
export type RepositoryPageOf<EntityClass extends AnyEntityClass> = {
	/** 1-based page number. */
	readonly page: number;

	/** How many rows the page holds. */
	readonly perPage: number;

	/** The blueprint key rows are sorted by. */
	readonly orderBy: RepositoryOrderKeysOf<PropertiesOfClass<EntityClass>>;

	/** Ascending or descending. */
	readonly direction: "asc" | "desc";
};
