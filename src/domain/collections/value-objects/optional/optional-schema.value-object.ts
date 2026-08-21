import { SchemaSchema } from "../../schemas";
import { optionalVO } from "../custom";
import { isSchemaWire } from "../helpers/schema-cache";

/**
 * {@link SchemaVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link SchemaSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `SchemaVO`'s own accept-everything `"{}"`.
 *
 * The `validate` hook mirrors `SchemaVO`'s own: a real string still has to
 * hydrate and compile as a TypeBox schema (`optionalVO` only wraps a *schema*,
 * not a VO's `validate` override, so this has to be declared here explicitly).
 * `undefined` passes through untouched.
 *
 * Redeclaring it is **not** the same thing as mirroring a sugar static — the
 * hook is the entire difference between "a string that parses as JSON" and "a
 * schema TypeBox can compile", which is what the type is for. `SchemaVO.match`
 * is genuinely sugar and stays unmirrored, per this subpath's own rule; pass
 * the value through to it (`SchemaVO.match(vo.value, x)`) when the key is
 * known to be set.
 *
 * @see `SchemaVO` in `@roastery/beans/domain/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalSchemaVO(undefined, { name: "shape", source: "post-type" }).value; // undefined
 * new OptionalSchemaVO('{"type":"string"}', { name: "shape", source: "post-type" });
 * ```
 */
export const OptionalSchemaVO = optionalVO(SchemaSchema, {
	name: "OptionalSchemaVO",
	validate: (value) => value === undefined || isSchemaWire(value),
});
