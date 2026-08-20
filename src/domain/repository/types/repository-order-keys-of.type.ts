import type { PropertiesShapeBase } from "@/domain/entity/types";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";
import type { RepositoryFilterValueOf } from "./repository-filter-value-of.type";

/**
 * The blueprint keys a collection read may be **ordered** by: every filter key
 * whose raw value is a single scalar.
 *
 * Filtering and ordering are not the same set, and conflating them is the
 * silent failure this type exists to prevent. `RepositoryFilterKeysOf` happily
 * includes keys whose raw value is an array or an object — `StringArrayVO`
 * (`string[]`), `customObjectVO`, `customRecordVO`. Those are perfectly
 * filterable (the in-memory double compares with `deepEquals`, a real adapter
 * with equality), but they have no total order: `{} < {}` is always `false` in
 * JavaScript, and ordering `jsonb` in Postgres uses an internal ordering that
 * means nothing in domain terms. Allowing `orderBy: "tags"` would compile and
 * then hand back a different order per adapter.
 *
 * Three details carry the whole type:
 *
 * - It is defined **over `RepositoryFilterKeysOf`**, so it inherits that type's
 *   two exclusions for free — a nested entity and a `sensitive` value-object —
 *   and gains the three identity fields, which is what makes `createdAt`, the
 *   key most pagination actually wants, available without a special case.
 * - **`NonNullable` is applied before the test.** Without it an
 *   `OptionalStringVO`/`NullableStringVO` key (`string | undefined`,
 *   `string | null`) would fall out, and a nullable column is perfectly
 *   orderable — what it needs is a nullish policy, which lives in the adapter
 *   (the shipped double sorts nullish last, like SQL's `NULLS LAST`).
 * - **Each primitive is tested in a tuple (`[X] extends [string]`), never
 *   distributed.** That is what drops a key whose raw value is a union of two
 *   primitives, such as `unionVO([t.String(), t.Number()])`: comparing `"10"`
 *   against `2` in JavaScript produces an answer, and it is not an order
 *   anybody asked for.
 *
 * There is deliberately **no runtime mirror** of this type in `src/testing/`.
 * Order keys generate no method, so nothing has to enumerate them at runtime —
 * unlike the method catalog, which `repositoryCatalogOf` is forced to keep a
 * second copy of.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @example
 * ```ts
 * const postProperties = { title: StringVO, tags: StringArrayVO, views: NumberVO };
 *
 * type Orderable = RepositoryOrderKeysOf<typeof postProperties>;
 * // "title" | "views" | "id" | "createdAt" | "updatedAt"
 * // — "tags" is absent: an array has no total order.
 * ```
 *
 * @see {@link RepositoryPageOf} — the only consumer.
 * @see {@link RepositoryFilterKeysOf} — the wider set this narrows.
 */
export type RepositoryOrderKeysOf<PropertiesShape extends PropertiesShapeBase> =
	{
		[Key in RepositoryFilterKeysOf<PropertiesShape>]: [
			NonNullable<RepositoryFilterValueOf<PropertiesShape, Key>>,
		] extends [string]
			? Key
			: [NonNullable<RepositoryFilterValueOf<PropertiesShape, Key>>] extends [
						number,
					]
				? Key
				: [NonNullable<RepositoryFilterValueOf<PropertiesShape, Key>>] extends [
							boolean,
						]
					? Key
					: never;
	}[RepositoryFilterKeysOf<PropertiesShape>];
