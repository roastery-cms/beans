import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { IRawEntity } from "./raw-entity.interface";
import type { RawValueOf } from "./raw-value-of.type";
import type { ReadableKey } from "./readable-key.type";
import type { WrappableClass } from "./wrappable-class.type";
import type { WrappedReadOf } from "@/domain/wrapper/types/wrapped-read-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";

/**
 * What `get` returns for one key: the raw string for an identity field, the
 * **unwrapped** contents for a multiplicity wrapper (so `post.tags` is the
 * `readonly PostTag[]` itself, not a collection object), the nested
 * **instance** for an entity- or record-valued property (so reads can chain
 * into their verbs), and the wrapped raw value for a value-object property.
 *
 * Returning the instance is what makes a record-valued key worth having:
 * `post.money.plus(10)` only works because `get` hands back the record itself
 * rather than its serialized form.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 * @typeParam Key - The key being read.
 *
 * @see {@link AccessorsOf} — the derived accessors mirror this type.
 */
export type ReadValueOf<
	PropertiesShape extends PropertiesShapeBase,
	Key extends ReadableKey<PropertiesShape>,
> = Key extends keyof IRawEntity
	? IRawEntity[Key]
	: Key extends keyof PropertiesShape
		? PropertiesShape[Key] extends {
				readonly wrapperKind: infer Kind extends WrapperKind;
				readonly wraps: infer Inner extends WrappableClass;
			}
			? WrappedReadOf<Kind, Inner>
			: PropertiesShape[Key] extends AnyEntityClass
				? PropertiesShape[Key]["prototype"]
				: PropertiesShape[Key] extends AnyRecordClass
					? PropertiesShape[Key]["prototype"]
					: RawValueOf<PropertiesShape[Key]>
		: never;
