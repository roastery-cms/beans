import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import { StringSchema } from "../schemas";

/**
 * Demo-mode default of {@link StringVO}.
 *
 * The base validates it like any other value, so it has to keep passing
 * {@link StringSchema} — which today constrains nothing beyond the type. This
 * holds for every VO: **the `meta.default` must pass its own `meta.schema`.**
 */
const STRING_PLACEHOLDER = "string";

/**
 * Unconstrained string value-object: any string passes, `""` included.
 *
 * Reuses {@link StringSchema} instead of declaring its own — it adds
 * semantics, not a structurally distinct shape.
 *
 * A property that must not be empty needs a value-object whose **schema** says
 * so; this one does not say it, and neither does an entity blueprint that
 * merely names the property `name`.
 *
 * @see {@link StringSchema}
 *
 * @example
 * ```ts
 * new StringVO("alan", { name: "name", source: "bean" });
 * StringVO.demo({ name: "name", source: "bean" });
 * ```
 */
export class StringVO extends ValueObject<string, typeof StringSchema> {
	/** @returns The string schema and the demo placeholder. */
	protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
		return { default: STRING_PLACEHOLDER, schema: StringSchema };
	}
}
