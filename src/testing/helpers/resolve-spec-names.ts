import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";

/**
 * The loose, runtime-facing shape of `inMemoryRepositoryOf`'s spec argument.
 *
 * Deliberately typed against `string` rather than the entity's own catalog:
 * the compile-time gate lives on the factory's own parameter
 * (`InMemoryRepositorySpecOf`), and this helper's whole job is to be the
 * *runtime* net underneath it, for a caller who reached here from plain JS.
 */
type LooseSpec =
	| readonly string[]
	| {
			readonly read?: readonly string[];
			readonly write?: readonly string[];
	  };

/**
 * Resolves a spec — an array of names, a `{ read, write }` object, or nothing
 * at all — to the flat list of methods to generate.
 *
 * **An empty or omitted spec means the whole catalog, not an empty
 * repository.** This diverges on purpose from `RepositoryOf`, where an empty
 * selection resolves to `never`: there, selecting nothing is a mistake worth
 * failing on; here, `inMemoryRepositoryOf(User, [], handler)` is how a caller
 * reaches the third argument without narrowing the second, so empty has to
 * read as "everything".
 *
 * A name outside the catalog throws `InvalidPropertyException` — the same
 * exception, and the same `(property, source)` shape, `commands` already
 * raises for a key its spec never declared. TypeScript rejects such a
 * name first; this is the backstop for a plain-JS caller, and it fires at
 * construction rather than leaving a silently missing method to surface as
 * `undefined is not a function` somewhere in a test.
 *
 * @param spec - The requested methods, in either form, or `undefined`.
 * @param catalog - Every name available for the blueprint, from `repositoryCatalogOf`.
 * @returns The names to generate — `catalog` itself when nothing was requested.
 *
 * @throws {InvalidPropertyException} When a requested name is not in `catalog`.
 *
 * @example
 * ```ts
 * resolveSpecNames(["findById"], catalog); // ["findById"]
 * resolveSpecNames({ read: ["findById"], write: ["create"] }, catalog); // ["findById", "create"]
 * resolveSpecNames([], catalog); // catalog
 * resolveSpecNames(undefined, catalog); // catalog
 * ```
 *
 * @see {@link repositoryCatalogOf} — where `catalog` comes from.
 */
export function resolveSpecNames(
	spec: LooseSpec | undefined,
	catalog: readonly string[],
): readonly string[] {
	const requested = resolveRequested(spec);

	if (requested.length === 0) return catalog;

	for (const name of requested)
		if (!catalog.includes(name))
			throw new InvalidPropertyException(name, "in-memory-repository");

	return requested;
}

/** Flattens either spec form to a plain list, the runtime twin of `InMemorySpecNamesOf`. */
function resolveRequested(spec: LooseSpec | undefined): readonly string[] {
	if (spec === undefined) return [];
	if (Array.isArray(spec)) return spec;

	const grouped = spec as {
		readonly read?: readonly string[];
		readonly write?: readonly string[];
	};

	return [...(grouped.read ?? []), ...(grouped.write ?? [])];
}
