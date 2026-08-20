import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/** Placeholder default: `null`, the natural "no value" state for a nullable VO. */
const NULL_PLACEHOLDER = null;

/**
 * Builds a `ValueObject` **class** whose value may legitimately be `null`,
 * wrapping an existing schema — the base `ValueObject`'s `ValueType` carries
 * no constraint, so `null` was always assignable; what was missing was a
 * schema that actually validates it.
 *
 * `null` is a deliberate value here, not an omission: unlike
 * {@link optionalVO}'s `undefined`, a `null` never makes a blueprint key
 * optional in the constructor payload (`UndefinedableKeys` only ever looks
 * for `undefined`) — a property backed by this still has to be named in the
 * payload, either with a real value or with `null` explicitly. That mirrors
 * the usual `null` (explicitly cleared) vs. `undefined` (not provided)
 * distinction between a database column and a request body.
 *
 * The generated schema is `t.Union([schema, t.Null()])`, which is what makes
 * `SchemaManager.match` (run by the base's `validate()`) accept `null` as
 * well as every value `schema` already accepted. The constructor's demo-mode
 * sentinel (`Demo`, a `unique symbol`) never collides with a real `null`, so
 * passing `null` explicitly builds a genuine instance rather than falling
 * back to `meta.default`.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam SchemaType - The wrapped schema, validating every non-`null`
 *   value.
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 *
 * @param schema - The schema the value must pass when it is not `null`.
 * @param args - Union-schema options, the demo-mode default, and hooks. When
 *   `default` is omitted it is `null` — the natural placeholder for a
 *   nullable value.
 * @returns The generated nullable value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the declared default does
 *   not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see {@link optionalVO} — the `undefined`-accepting counterpart, which
 *   *does* make the blueprint key optional.
 *
 * @example
 * ```ts
 * const NullableBio = nullableVO(StringSchema);
 *
 * new NullableBio(null, { name: "bio", source: "author" }).value;  // null
 * new NullableBio("Alan", { name: "bio", source: "author" }).value; // "Alan"
 * ```
 */
export function nullableVO<
	SchemaType extends t.TSchema,
	Sensitive extends boolean = false,
>(
	schema: SchemaType,
	args: ICustomValueObjectArgs<
		t.Static<SchemaType> | null,
		t.SchemaOptions,
		Sensitive
	> = {},
): ValueObjectClassOf<
	t.Static<SchemaType> | null,
	t.TUnion<[SchemaType, t.TNull]>,
	Sensitive
> {
	const { default: fallback = NULL_PLACEHOLDER, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Union([schema, t.Null()], options),
	});
}
