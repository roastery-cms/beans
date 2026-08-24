import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { ValueObject } from "@/domain/value-object";
import type { AnyWrapperClass } from "@/domain/wrapper/types/any-wrapper-class.type";
import type { WrappedSchemaOf } from "@/domain/wrapper/types/wrapped-schema-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";

/**
 * The TypeBox schema type contributed by one command blueprint property: for a
 * multiplicity wrapper, the inner class's schema under that multiplicity; for
 * a nested record, its aggregate schema; otherwise the schema parameter of the
 * value-object.
 *
 * The entity pillar's counterpart is `SchemaOf`, which has a fourth branch
 * this one does not need: a `Command` blueprint never holds a bare `Entity`.
 * Every other branch has to be here, because `CommandPropertiesShapeBase`
 * admits records and wrappers just as an entity blueprint does — and until
 * this type existed, both resolved to `never` inside `CommandSchemaOf` while
 * `modelFor` built the right schema at runtime.
 *
 * Branch order and the inline probe of the two wrapper statics follow the
 * house rule the blueprint conditionals all observe — testing
 * `extends AnyWrapperClass` structurally is what TS2589s.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link CommandSchemaOf} — the aggregate object schema built from these.
 * @see `SchemaOf` in `@roastery/beans/domain/entity/types` — the domain-layer
 *   counterpart, which the entity and record pillars share.
 */
export type CommandPropertySchemaOf<
	Class extends AnyValueObjectClass | AnyRecordClass | AnyWrapperClass,
> = Class extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedSchemaOf<Kind, Inner>
	: Class extends AnyRecordClass
		? Class["prototype"]["schema"]
		: Class["prototype"] extends ValueObject<unknown, infer SchemaType, boolean>
			? SchemaType
			: never;
