import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/**
 * Builds a `ValueObject` **class** whose value may be any one of several
 * shapes — the "this field is legitimately a `string` *or* a `number`" case
 * (a document number, an external id issued by two different systems), which
 * a single schema cannot express.
 *
 * `optionalVO` and `nullableVO` are the two specialised forms of this already:
 * each wraps one schema in a union with `t.Undefined()` / `t.Null()`. Reach
 * for those when the extra member is exactly one of those two, and for this
 * one when the alternatives are genuine domain values. A member built with
 * `t.Undefined()` here has the same effect `optionalVO` does — the blueprint
 * key becomes omittable in the constructor payload, since `UndefinedableKeys`
 * only ever looks at whether the value type includes `undefined`.
 *
 * **`default` is required**, unlike every other sugar factory here: there is
 * no placeholder a union of arbitrary schemas could fall back to. `customEnumVO`
 * gets away without one because its first value is always a valid member;
 * a union has no equivalent. Whatever is declared is validated against the
 * generated union inside the factory call, so a mistake fails at import time.
 *
 * **Call it at module scope, once** — see {@link defineValueObject} for why.
 *
 * @typeParam Schemas - The tuple of member schemas, read as a `const` type
 *   parameter so an array literal needs no `as const` at the call site. At
 *   least two: a union of one is that schema, and almost certainly a typo.
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 *
 * @param schemas - The schemas the value may match, tried in order.
 * @param args - Union-schema options, the required demo-mode default, and hooks.
 * @returns The generated union value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the declared default does
 *   not pass any member of the union.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see `optionalVO`, `nullableVO` — the two specialised forms.
 *
 * @example
 * ```ts
 * const Document = unionVO([StringSchema, NumberSchema], {
 * 	default: "",
 * 	name: "Document",
 * });
 *
 * const userProperties = { document: Document };
 *
 * new User({ document: "123.456.789-00" });
 * new User({ document: 12_345_678_900 });
 * ```
 */
export function unionVO<
	const Schemas extends readonly [t.TSchema, t.TSchema, ...t.TSchema[]],
	Sensitive extends boolean = false,
>(
	schemas: Schemas,
	args: ICustomValueObjectArgs<
		t.Static<Schemas[number]>,
		t.SchemaOptions,
		Sensitive
	> & {
		readonly default:
			| t.Static<Schemas[number]>
			| (() => t.Static<Schemas[number]>);
	},
): ValueObjectClassOf<
	t.Static<Schemas[number]>,
	t.TUnion<[...Schemas]>,
	Sensitive
> {
	const { default: fallback, options, ...hooks } = args;

	return defineValueObject<
		t.Static<Schemas[number]>,
		t.TUnion<[...Schemas]>,
		Sensitive
	>({
		...hooks,
		default: fallback,
		// Two casts, one reason each. `t.Union` takes a **mutable** array, so the
		// readonly tuple is spread and restored, or the member types are widened to
		// `TSchema[]` and the return type stops naming the schemas the caller
		// passed. And `t.Union`'s own return is a conditional (`[] → TNever`,
		// `[T] → T`, otherwise `TUnion<T>`) that TypeScript cannot reduce while
		// `Schemas` is still generic, even though the tuple's `[TSchema, TSchema,
		// ...TSchema[]]` bound rules both degenerate branches out.
		schema: t.Union([...schemas] as [...Schemas], options) as t.TUnion<
			[...Schemas]
		>,
	});
}
