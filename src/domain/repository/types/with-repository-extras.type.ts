import type { RepositoryExtraMethodsBase } from "./repository-extra-methods-base.type";

/**
 * Intersects a generated repository with the caller's own extra methods,
 * skipping the intersection entirely when either side is empty.
 *
 * The two guards exist so the common cases keep a clean hover. Without the
 * first, every repository declared without extras would read as
 * `… & Record<never, never>`; without the second, a selection that resolved to
 * `never` would come back as `never & Extras`, which is just `never` with a
 * misleading spelling — the extras a caller wrote by hand are still a real
 * contract even when the generated half selects nothing, so they are returned
 * on their own instead.
 *
 * @typeParam Generated - The blueprint-derived half, or `never`.
 * @typeParam Extras - The hand-written half.
 *
 * @see {@link RepositoryOf} — the only consumer.
 */
export type WithRepositoryExtras<
	Generated,
	Extras extends RepositoryExtraMethodsBase,
> = [keyof Extras] extends [never]
	? Generated
	: [Generated] extends [never]
		? Extras
		: Generated & Extras;
