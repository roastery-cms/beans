import type { SchemaOf } from "@/domain/entity/types/schema-of.type";
import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { t } from "@roastery/terroir";
import type { WrapperKind } from "./wrapper-kind.type";

/**
 * The TypeBox schema type of a wrapped blueprint property: the inner class's
 * own schema under the declared multiplicity — `t.TArray` for `arrayOf`, a
 * union with `undefined` for `optionalOf`, a union with `null` for
 * `nullableOf`.
 *
 * These are the exact shapes `wrapperModelFor` builds at runtime, so
 * `entity.schema`, `record.schema` and `command.schema` type what they
 * actually hold. Without it a wrapped key resolved to `never` in all three —
 * the runtime was right and only the type lied, which is the quiet kind of
 * wrong.
 *
 * The `optional` form needs no `t.TOptional` here: the union accepts
 * `undefined`, and each pillar's existing
 * `acceptsUndefined(model) ? t.Optional(model) : model` line drops the key out
 * of `required` on its own — the same way it already does for an `optionalVO`
 * property.
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @example
 * ```ts
 * type Tags = WrappedSchemaOf<"array", typeof PostTag>; // t.TArray<EntitySchemaOf<…>>
 * type Type = WrappedSchemaOf<"optional", typeof PostType>; // t.TUnion<[…, t.TUndefined]>
 * ```
 *
 * @see `wrapperModelFor` in `../helpers/model-for` — the runtime this mirrors.
 * @see `SchemaOf` in `@/domain/entity/types` — the per-item definition, whose
 *   wrapper branch resolves to this.
 */
export type WrappedSchemaOf<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
> = Kind extends "array"
	? t.TArray<SchemaOf<Inner>>
	: Kind extends "optional"
		? t.TUnion<[SchemaOf<Inner>, t.TUndefined]>
		: t.TUnion<[SchemaOf<Inner>, t.TNull]>;
