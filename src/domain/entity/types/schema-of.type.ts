import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { ValueObject } from "@/domain/value-object";
import type { WrappedSchemaOf } from "@/domain/wrapper/types/wrapped-schema-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";
import type { WrappableClass } from "./wrappable-class.type";

/**
 * The TypeBox schema type contributed by one blueprint property: for a
 * multiplicity wrapper, the inner class's schema under that multiplicity; the
 * nested entity's or record's aggregate schema; or the schema parameter of the
 * value-object.
 *
 * The wrapper branch is written **first**, as it is in `InputValueOf` and
 * `RawValueOf`, and probes the two statics inline rather than testing
 * `extends AnyWrapperClass` — the measured TS2589 constraint every blueprint
 * conditional in the package observes. The record branch has to come before
 * the value-object one, which is the fallback here rather than a guarded
 * branch of its own.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link EntitySchemaOf} — the aggregate object schema built from these.
 * @see `WrappedSchemaOf` in `@/domain/wrapper/types` — the wrapper branch, and
 *   the runtime (`wrapperModelFor`) it mirrors.
 */
export type SchemaOf<Class extends AnyPropertyClass> = Class extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedSchemaOf<Kind, Inner>
	: Class extends AnyEntityClass
		? Class["prototype"]["schema"]
		: Class extends AnyRecordClass
			? Class["prototype"]["schema"]
			: Class["prototype"] extends ValueObject<
						unknown,
						infer SchemaType,
						boolean
					>
				? SchemaType
				: never;
