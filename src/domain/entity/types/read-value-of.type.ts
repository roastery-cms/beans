import type { AnyEntityClass } from "./any-entity-class.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { IRawEntity } from "./raw-entity.interface";
import type { RawValueOf } from "./raw-value-of.type";
import type { ReadableKey } from "./readable-key.type";

/**
 * What `get` returns for one key: the raw string for an identity field, the
 * nested **instance** for an entity-valued property (so reads can chain), and
 * the wrapped raw value for a value-object property.
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
		? PropertiesShape[Key] extends AnyEntityClass
			? PropertiesShape[Key]["prototype"]
			: RawValueOf<PropertiesShape[Key]>
		: never;
