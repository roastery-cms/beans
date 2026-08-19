/**
 * The window a collection read is limited to: which page, and how many rows
 * that page holds.
 *
 * Both fields are required, on purpose. Every method in this pillar that can
 * return more than one row takes one of these, so an unbounded `SELECT *` is
 * not expressible through a generated port — a repository contract that lets
 * a caller forget the limit is a contract that will eventually be called
 * without one. `beans` declares no default page size either: what a sane
 * `perPage` is belongs to the application, not to a library that cannot know
 * the row width, the transport, or the read pattern.
 *
 * @example
 * ```ts
 * await users.findManyByName("alan", { page: 1, perPage: 20 });
 * ```
 *
 * @see {@link ICanReadMany} — the unfiltered collection read.
 * @see {@link ICanReadManyBy} — the per-key collection read.
 */
export type RepositoryPage = {
	/** 1-based page number. */
	readonly page: number;

	/** How many rows the page holds. */
	readonly perPage: number;
};
