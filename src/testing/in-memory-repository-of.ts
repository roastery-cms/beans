import { definitionOf } from "@/domain/entity/helpers/read-definition";
import { deepEquals, uniqueKeysOf } from "@/domain/entity/helpers";
import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type {
	RepositoryExtraMethodsBase,
	RepositoryMode,
	RepositoryOf,
	RepositoryPage,
} from "@/domain/repository/types";
import type {
	InMemoryRepositoryContext,
	InMemoryRepositoryHandler,
	InMemoryRepositorySpecOf,
	InMemorySpecNamesOf,
} from "./types";
import {
	ConflictException,
	ResourceNotFoundException,
} from "@roastery/terroir/exceptions/infra";
import { capitalizeKey } from "./helpers/capitalize-key";
import { filterKeysOf } from "./helpers/filter-keys-of";
import { repositoryCatalogOf } from "./helpers/repository-catalog-of";
import { resolveSpecNames } from "./helpers/resolve-spec-names";
import { uniqueConflictOf } from "./helpers/unique-conflict-of";

/**
 * The `source` every exception this double raises carries — the identifier of
 * the *datastore*, which is what terroir's infra exceptions ask for, and the
 * same string `resolveSpecNames` already uses. Which entity, key and value were
 * involved goes in the message.
 */
const REPOSITORY_SOURCE = "in-memory-repository";

/** One stored record: exactly what `toJSON()` produced, kept loose internally. */
type Row = Record<string, unknown>;

/** The static this factory needs off the class, which `AnyEntityClass` does not declare. */
type Hydratable = { fromJSON(row: Row): unknown };

/** The two members every write reads off the entity it is handed. */
type Persistable = { id: string; toJSON(): Row };

/**
 * Builds an in-memory repository for one entity, generated from its blueprint
 * and typed as the very same `RepositoryOf` port a real adapter implements.
 *
 * It exists because the alternative is writing the same `Map`-plus-four-methods
 * object in every test file that touches a `Command` — an object that is
 * entirely derivable, since the blueprint already says which keys exist and
 * `toJSON`/`fromJSON` already know how to cross the boundary.
 *
 * The returned repository is a **faithful** double, not a convenient one: it
 * stores `entity.toJSON()` and hands back `fromJSON(row)` on every read. So
 * mutating an entity after `create` does not change what is stored — only a
 * real `update()` does — and a read returns an equal but distinct instance,
 * with its own empty `[Events]` and `[Storage]` slots. Compare with `toEqual`,
 * or on `id`; `toBe` will not hold, and that is the price of the double
 * catching the "forgot to call update" bug instead of hiding it.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Spec - Which methods to generate ({@link InMemoryRepositorySpecOf}).
 * @typeParam Extras - The handler's extra methods, inferred from its return value.
 *
 * @param entityClass - The entity to build a repository for, e.g. `User`.
 * @param spec - The methods to generate, as an array or a `{ read, write }`
 *   object. Omitted **or empty** means the whole catalog.
 * @param handler - Given what was generated, returns extra methods to fold in.
 * @returns A ready repository, typed as `RepositoryOf<EntityClass, …>` plus
 *   whatever `handler` returned.
 *
 * @throws {InvalidPropertyException} When `spec` names a method the blueprint
 *   does not generate. TypeScript rejects that first; this fires for a
 *   plain-JS caller.
 *
 * @example
 * ```ts
 * import { inMemoryRepositoryOf } from "@roastery/beans/testing";
 *
 * // Everything the blueprint generates
 * const users = inMemoryRepositoryOf(User);
 *
 * // Only what this test needs — the rest is absent, at runtime and in the type
 * const readers = inMemoryRepositoryOf(User, ["findById", "findByEmail"]);
 *
 * // With test helpers and a stubbed method; `[]` is how you reach the third
 * // argument without narrowing the second
 * const flaky = inMemoryRepositoryOf(User, [], (context) => ({
 *   seed: (...rows: User[]) => {
 *     for (const row of rows) context.rows.set(row.id, row.toJSON());
 *   },
 *   async findById(id: string) {
 *     if (id === "boom") throw new Error("connection lost");
 *     return context.findById(id); // the generated one, still reachable
 *   },
 * }));
 * ```
 *
 * Key rules:
 *
 * - **The spec applies at runtime, not only in the type.** `["findById"]`
 *   produces an object that literally has one method, so a call outside the
 *   spec fails in the test run as well as in the compiler — and `context` is
 *   exactly the generated set, nothing more.
 * - **Empty or omitted means everything**, the opposite of `RepositoryOf`'s own
 *   empty-selection rule. See {@link InMemorySpecNamesOf} for why the two
 *   differ on purpose.
 * - **The handler's methods are merged over the generated ones**, so a name
 *   collision replaces. `context` is a snapshot taken beforehand, which is what
 *   lets a replacement delegate to the original.
 * - **Filtering compares with `deepEquals`, not `===`.** A `StringArrayVO` key
 *   serializes to an array, and reference equality would never match one —
 *   silently, which is the worst way for a test double to fail.
 * - **`findMany` returns insertion order.** The port's contract promises no
 *   ordering (no two adapters would agree on one), so a test that depends on
 *   this order is testing the double rather than the code.
 *
 * @see `RepositoryOf` in `@roastery/beans/domain/repository/types` — the port this satisfies.
 * @see {@link InMemoryRepositoryContext} — what the handler receives.
 */
export function inMemoryRepositoryOf<
	EntityClass extends AnyEntityClass,
	const Spec extends InMemoryRepositorySpecOf<EntityClass> = readonly [],
	Extras extends RepositoryExtraMethodsBase = Record<never, never>,
>(
	entityClass: EntityClass,
	spec?: Spec,
	handler?: InMemoryRepositoryHandler<
		EntityClass,
		InMemorySpecNamesOf<EntityClass, Spec>,
		Extras
	>,
): RepositoryOf<
	EntityClass,
	InMemorySpecNamesOf<EntityClass, Spec>,
	RepositoryMode,
	Extras
> {
	const { properties, source } = definitionOf(entityClass);
	const rows = new Map<string, Row>();

	// Resolved once, outside the write methods: the scan probes `defineMeta` per
	// blueprint key, and repaying that on every insert would be pure waste.
	const uniqueKeys = uniqueKeysOf(entityClass);

	// The one cast this factory needs. `AnyEntityClass` describes the construct
	// signature and the prototype, not the `fromJSON` static — and tightening
	// the bound to demand it rejects a real `typeof User`, because `fromJSON`'s
	// `this`-polymorphic return does not match a fixed structural declaration.
	const hydrate = (row: Row): never =>
		(entityClass as unknown as Hydratable).fromJSON(row) as never;

	// `start` is clamped so a page below 1 cannot turn into a negative slice
	// index, which would silently return a window counted from the end.
	const paginate = <Item>(
		items: readonly Item[],
		page: RepositoryPage,
	): readonly Item[] => {
		const start = Math.max(0, (page.page - 1) * page.perPage);

		return items.slice(start, start + page.perPage);
	};

	const matching = (key: string, value: unknown): Row[] =>
		[...rows.values()].filter((row) => deepEquals(row[key], value));

	// A write that would touch no row is a failure, not a silent insert: an
	// `UPDATE`/`DELETE` affecting zero rows is exactly the "I forgot to persist
	// this aggregate" bug a double is there to surface.
	const requireStored = (id: string, operation: string): void => {
		if (!rows.has(id))
			throw new ResourceNotFoundException(
				REPOSITORY_SOURCE,
				`No ${source} with id "${id}" to ${operation}.`,
			);
	};

	// The unique-constraint check, scanning `rows` directly rather than any
	// generated `findBy*`: a repository built with `spec: ["create"]` has no
	// readers at all and must still refuse a duplicate.
	const write = (row: Row, selfId: string | undefined): void => {
		const conflict = uniqueConflictOf(rows, uniqueKeys, row, selfId);

		if (conflict !== undefined)
			throw new ConflictException(
				REPOSITORY_SOURCE,
				`Another ${source} already holds ${JSON.stringify(row[conflict])} in the unique field "${conflict}".`,
			);
	};

	// Installed before the per-key methods, mirroring how `RepositoryContractOf`
	// tests the fixed names first: a blueprint key called `ids` would otherwise
	// take `findManyByIds` away from the batch loader.
	const fixed: Row = {
		count: async () => rows.size,
		findMany: async (page: RepositoryPage) =>
			paginate([...rows.values()], page).map(hydrate),
		findManyByIds: async (ids: readonly string[]) =>
			ids.map((id) => {
				const row = rows.get(id);

				return row ? hydrate(row) : null;
			}),
		create: async (entity: Persistable) => {
			// The primary key first: with `id` among the unique keys, the scan
			// below would catch this too, but would report it as a duplicate
			// field rather than by the name the failure actually has.
			if (rows.has(entity.id))
				throw new ConflictException(
					REPOSITORY_SOURCE,
					`A ${source} with id "${entity.id}" already exists.`,
				);

			const row = entity.toJSON();

			write(row, undefined);
			rows.set(entity.id, row);
		},
		update: async (entity: Persistable) => {
			requireStored(entity.id, "update");

			const row = entity.toJSON();

			// `entity.id` excludes the row being replaced, which is what lets an
			// unchanged unique value through while a sibling's value still fails.
			write(row, entity.id);
			rows.set(entity.id, row);
		},
		delete: async (entity: Persistable) => {
			requireStored(entity.id, "delete");
			rows.delete(entity.id);
		},
	};

	const singleByName = new Map<string, string>();
	const manyByName = new Map<string, string>();

	for (const key of filterKeysOf(properties)) {
		singleByName.set(`findBy${capitalizeKey(key)}`, key);
		if (key !== "id") manyByName.set(`findManyBy${capitalizeKey(key)}`, key);
	}

	const repository: Row = {};

	for (const name of resolveSpecNames(spec, repositoryCatalogOf(properties))) {
		if (Object.hasOwn(fixed, name)) {
			repository[name] = fixed[name];
			continue;
		}

		const singleKey = singleByName.get(name);

		if (singleKey !== undefined) {
			repository[name] = async (value: unknown) => {
				const [row] = matching(singleKey, value);

				return row ? hydrate(row) : null;
			};
			continue;
		}

		const manyKey = manyByName.get(name);

		if (manyKey !== undefined)
			repository[name] = async (value: unknown, page: RepositoryPage) =>
				paginate(matching(manyKey, value), page).map(hydrate);
	}

	if (handler) {
		// A spread, not a reference: an extra that replaces a generated method
		// still reaches the original through the context it was handed.
		const context = {
			...repository,
			rows,
			hydrate,
		} as unknown as InMemoryRepositoryContext<
			EntityClass,
			InMemorySpecNamesOf<EntityClass, Spec>
		>;

		Object.assign(repository, handler(context));
	}

	return repository as unknown as RepositoryOf<
		EntityClass,
		InMemorySpecNamesOf<EntityClass, Spec>,
		RepositoryMode,
		Extras
	>;
}
