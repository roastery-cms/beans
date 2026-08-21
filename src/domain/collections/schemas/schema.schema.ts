import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for a **JSON-serialized TypeBox schema** — the wire form
 * `SchemaManager.serialize` produces and `SchemaManager.build` re-hydrates.
 *
 * It exists for the case a schema is itself domain data: a CMS whose post
 * types each declare the shape of their own payload stores that shape in a
 * column, and validates arbitrary content against it at runtime.
 *
 * Validation here is deliberately shallow — the `"json"` format registered in
 * `@roastery/terroir/schema/formats` only answers "does this parse as JSON".
 * Whether the parsed value is a schema TypeBox can actually compile is a
 * question no JSON Schema can ask, so {@link SchemaVO} answers it in its own
 * `validate()`. Reach for the VO whenever the value is untrusted; this schema
 * alone will happily accept `{"type":"banana"}`.
 *
 * Being a schema of its own rather than a reuse of `StringSchema` matters for
 * one concrete reason: the aggregate schema an entity derives is a published
 * contract, and describing this field as "a string value of any length" would
 * tell a consumer nothing about what belongs in it.
 *
 * @see {@link SchemaVO} — the value-object that also checks it compiles.
 * @see `SchemaManager` in `@roastery/terroir/schema` — produces and consumes this form.
 */
export const SchemaSchema = t.String({
	description: "A JSON-serialized TypeBox schema.",
	examples: ['{"type":"object","properties":{"author":{"type":"string"}}}'],
	format: "json",
});

/** Static type of {@link SchemaSchema} — equivalent to `string`. */
export type SchemaSchema = ToDTO<typeof SchemaSchema>;
