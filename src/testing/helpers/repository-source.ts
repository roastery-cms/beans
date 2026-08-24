/**
 * The `source` every exception the in-memory pillar raises carries — the
 * identifier of the *datastore*, which is what terroir's infra exceptions ask
 * for. Which entity, key and value were involved goes in the message.
 *
 * Shared by the two doubles rather than spelled twice: `inMemoryRepositoryOf`
 * raises `ConflictException`/`ResourceNotFoundException` with it, and
 * `inMemoryTransactionOf` raises `DependencyNotWiredException` with it, and a
 * test asserting the slot should not have to know which of the two produced
 * the failure.
 *
 * Internal. `testing/helpers/` has no barrel; imported by direct path.
 *
 * @see `inMemoryRepositoryOf` and `inMemoryTransactionOf` — the two callers.
 */
export const REPOSITORY_SOURCE = "in-memory-repository";
