/**
 * @module @roastery/beans/testing/types
 *
 * The types behind `inMemoryRepositoryOf`. Everything here describes its
 * arguments — the port it returns is `RepositoryOf<…>` itself, from the
 * `repository` pillar, with no wrapper type of its own.
 *
 * `SelectedInMemoryNamesOf` supports {@link InMemorySpecNamesOf} and stays out
 * of this barrel — reachable by direct path when needed.
 *
 * Re-exports:
 * - {@link InMemoryRepositoryContext} — what the handler is given.
 * - {@link InMemoryRepositoryHandler} — the handler's own signature.
 * - {@link InMemoryRepositorySpecOf} — the two forms the spec argument accepts.
 * - {@link InMemorySpecNamesOf} — the spec collapsed to a union of method names.
 */

export type { InMemoryRepositoryContext } from "./in-memory-repository-context.type";
export type { InMemoryRepositoryHandler } from "./in-memory-repository-handler.type";
export type { InMemoryRepositorySpecOf } from "./in-memory-repository-spec-of.type";
export type { InMemorySpecNamesOf } from "./in-memory-spec-names-of.type";
