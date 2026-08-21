import { ValueObject } from "@/domain/value-object";
import type {
	IValueObjectContext,
	IValueObjectMetadata,
} from "@/domain/value-object/types";
import type { t } from "@roastery/terroir";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { Context } from "@roastery/terroir/symbols";
import { SchemaSchema } from "../schemas";
import { buildSchema, isSchemaWire } from "./helpers/schema-cache";

/**
 * Demo-mode default of {@link SchemaVO}.
 *
 * `"{}"` is not a placeholder in the usual sense — TypeBox hydrates the empty
 * object as `Kind: "Any"`, so it is the schema that **accepts everything**.
 * That is the right default for a demo fixture (a `PostType` built with
 * `.demo()` should not reject the `Post` payloads built alongside it), but it
 * is a deliberate choice rather than an inert stand-in, and a production value
 * that reaches this default is validating nothing.
 */
const SCHEMA_PLACEHOLDER = "{}";

/** The `{ name, source }` reported when `match` is handed a raw wire string. */
const MATCH_CONTEXT: IValueObjectContext = {
	name: "schema",
	source: "schema-value-object",
};

/**
 * A **JSON-serialized TypeBox schema**, validated to actually compile.
 * Validates against {@link SchemaSchema}, then hydrates the value to prove it.
 *
 * This is the value-object for the case a schema is itself domain data: a CMS
 * whose post types each declare the shape of their own payload stores that
 * shape in a column, and validates arbitrary content against it at runtime.
 * The stored `value` is the wire string, not a live `TSchema`, precisely
 * because it has to survive `toJSON`/`fromJSON` — a hydrated schema carries a
 * non-enumerable `[Kind]` symbol that `JSON.stringify` strips, so an entity
 * holding one would not round-trip.
 *
 * Two layers of validation, and both are needed: {@link SchemaSchema}'s
 * `"json"` format answers "does this parse", which no JSON Schema can extend
 * to "and is it a schema TypeBox can compile" — so {@link SchemaVO.validate}
 * asks the second question by hydrating the value. `'{"type":"banana"}'`
 * passes the first and fails the second.
 *
 * Hydration is memoized by wire string (`helpers/schema-cache`), which is what
 * makes {@link SchemaVO.match} cheap: `SchemaManager`'s own validator cache is
 * keyed by schema *object*, and `SchemaManager.build` mints a new one every
 * call, so an un-memoized `match` recompiles every time. Constructing the VO
 * warms that cache, so the first `match` after it costs nothing extra.
 *
 * @see {@link SchemaSchema}
 * @see `SchemaManager` in `@roastery/terroir/schema` — produces and consumes the wire form.
 *
 * @example
 * ```ts
 * const context = { name: "shape", source: "post-type" };
 *
 * const shape = SchemaVO.from(t.Object({ author: t.String() }), context);
 *
 * SchemaVO.match(shape, { author: "Alan" }); // true
 * SchemaVO.match(shape, { author: 42 });     // false
 * ```
 */
export class SchemaVO extends ValueObject<string, typeof SchemaSchema> {
	/** @returns The wire schema and the accept-everything `"{}"` demo default. */
	protected defineMeta(): IValueObjectMetadata<
		string,
		typeof SchemaSchema,
		false
	> {
		return { default: SCHEMA_PLACEHOLDER, schema: SchemaSchema };
	}

	/**
	 * Runs the schema first, then proves the value is a schema TypeBox can
	 * actually compile — the half `SchemaSchema` structurally cannot express.
	 *
	 * Hydrating rather than calling `SchemaManager.isSchema` is deliberate:
	 * `isSchema` compiles the value and throws the result away, so validating
	 * and then matching would pay for the same compilation twice. This warms
	 * the shared cache instead.
	 *
	 * @throws `InvalidPropertyException` — when the value is not a compilable
	 *   TypeBox schema.
	 */
	protected override validate(): void {
		super.validate();

		if (!isSchemaWire(this.value))
			throw new InvalidPropertyException(
				this[Context].name,
				this[Context].source,
			);
	}

	/**
	 * Checks a value against a stored schema.
	 *
	 * Accepts either an already-built `SchemaVO` or a raw wire string. The two
	 * differ in one way worth knowing: a `SchemaVO` **cannot** make this throw
	 * — an instance only exists if it passed {@link SchemaVO.validate}, so its
	 * wire is compilable by class invariant. A raw string carries no such
	 * guarantee, and an uncompilable one raises rather than quietly reading as
	 * "did not match": those are different answers, and conflating them would
	 * turn a typo into a silent `false`.
	 *
	 * @param schema - The stored schema, as a `SchemaVO` or its wire string.
	 * @param value - Arbitrary value to check.
	 * @returns `true` when `value` satisfies every constraint of `schema`.
	 *
	 * @throws `InvalidPropertyException` — when `schema` is a string that is
	 *   not a compilable TypeBox schema.
	 */
	public static match(schema: string | SchemaVO, value: unknown): boolean {
		const wire = typeof schema === "string" ? schema : schema.value;

		return SchemaManager.match(buildSchema(wire, MATCH_CONTEXT), value);
	}

	/**
	 * Builds a `SchemaVO` from a live TypeBox schema, serializing it on the way
	 * in — the producer-side entry point, so a caller never has to reach for
	 * `SchemaManager.serialize` by hand.
	 *
	 * @param schema - The schema to store.
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns The wrapped wire form of `schema`.
	 *
	 * @example
	 * ```ts
	 * SchemaVO.from(t.Object({ author: t.String() }), { name: "shape", source: "post-type" });
	 * ```
	 */
	public static from(
		schema: t.TSchema,
		context: IValueObjectContext,
	): SchemaVO {
		return new SchemaVO(SchemaManager.serialize(schema), context);
	}
}
