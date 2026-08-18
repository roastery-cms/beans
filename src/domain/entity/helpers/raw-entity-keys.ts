/**
 * The keys the base supplies on every entity. `set`/`setMany` refuse them
 * (identity is immutable through the mutation path) and `get` accepts them.
 */
export const RAW_ENTITY_KEYS: ReadonlySet<PropertyKey> = new Set<PropertyKey>([
	"id",
	"createdAt",
	"updatedAt",
]);
