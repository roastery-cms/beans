import type { RepositorySpecNamesOf } from "@/domain/repository/types/repository-spec-names-of.type";

/**
 * Flattens a runtime spec to the union of names it lists — before the
 * empty-means-everything rule is applied.
 *
 * The array branch is tested **first**: a `{ read, write }` object is not an
 * array, so it falls through to `RepositorySpecNamesOf`, which already knows
 * how to read both halves of the grouped form through `infer`. Reusing it is
 * the point — the grouped form has exactly one reading in this package, and it
 * lives in the `repository` pillar.
 *
 * An omitted argument arrives here as `undefined`, matches neither branch's
 * shape, and resolves to `never` — which {@link InMemorySpecNamesOf} then
 * turns into the full catalog.
 *
 * @typeParam Spec - The runtime spec, in either form.
 *
 * @see {@link InMemorySpecNamesOf} — the only consumer.
 */
export type SelectedInMemoryNamesOf<Spec> = Spec extends readonly (infer Name)[]
	? Name
	: RepositorySpecNamesOf<Spec>;
