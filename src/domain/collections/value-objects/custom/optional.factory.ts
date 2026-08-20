import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/**
 * Builds a `ValueObject` **class** whose value may legitimately be
 * `undefined`, wrapping an existing schema rather than a value the type
 * itself already forbids nothing about — the base `ValueObject`'s `ValueType`
 * carries no constraint, so `undefined` was always assignable; what was
 * missing was a schema that actually validates it.
 *
 * The generated schema is `t.Union([schema, t.Undefined()])`, which is what
 * makes `SchemaManager.match` (run by the base's `validate()`) accept
 * `undefined` as well as every value `schema` already accepted. The
 * constructor's demo-mode sentinel (`Demo`, a `unique symbol`) never collides
 * with a real `undefined`, so passing `undefined` explicitly builds a genuine
 * instance rather than falling back to `meta.default`.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam SchemaType - The wrapped schema, validating every non-`undefined`
 *   value.
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 *
 * @param schema - The schema the value must pass when it is not `undefined`.
 * @param args - Union-schema options, the demo-mode default, and hooks. When
 *   `default` is omitted it is `undefined` — the natural placeholder for an
 *   optional value.
 * @returns The generated optional value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the declared default does
 *   not pass the resulting schema.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 *
 * @example
 * ```ts
 * const OptionalBio = optionalVO(StringSchema);
 *
 * new OptionalBio(undefined, { name: "bio", source: "author" }).value; // undefined
 * new OptionalBio("Alan", { name: "bio", source: "author" }).value;    // "Alan"
 * ```
 */
export function optionalVO<
	SchemaType extends t.TSchema,
	Sensitive extends boolean = false,
>(
	schema: SchemaType,
	args: ICustomValueObjectArgs<
		t.Static<SchemaType> | undefined,
		t.SchemaOptions,
		Sensitive
	> = {},
): ValueObjectClassOf<
	t.Static<SchemaType> | undefined,
	t.TUnion<[SchemaType, t.TUndefined]>,
	Sensitive
> {
	const { default: fallback, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Union([schema, t.Undefined()], options),
	});
}
