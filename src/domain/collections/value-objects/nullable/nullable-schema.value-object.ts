import { SchemaSchema } from "../../schemas";
import { nullableVO } from "../custom";
import { isSchemaWire } from "../helpers/schema-cache";

/**
 * {@link SchemaVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link SchemaSchema} — same validation,
 * with `null` added to the accepted values. Its demo-mode default is `null`,
 * not `SchemaVO`'s own accept-everything `"{}"`. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly.
 *
 * The `validate` hook mirrors `SchemaVO`'s own: a real string still has to
 * hydrate and compile as a TypeBox schema (`nullableVO` only wraps a *schema*,
 * not a VO's `validate` override, so this has to be declared here explicitly).
 * `null` passes through untouched.
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
 * new NullableSchemaVO(null, { name: "shape", source: "post-type" }).value; // null
 * new NullableSchemaVO('{"type":"string"}', { name: "shape", source: "post-type" });
 * ```
 */
export const NullableSchemaVO = nullableVO(SchemaSchema, {
	name: "NullableSchemaVO",
	validate: (value) => value === null || isSchemaWire(value),
});
