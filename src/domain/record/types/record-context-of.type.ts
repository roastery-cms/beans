import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The built property map a `DomainRecord` instance keeps under `[Context]`:
 * one **instance** (value-object, nested entity or nested record) per
 * blueprint key.
 *
 * The entity's `ContextOf` intersects `BaseContext` — the three identity
 * value-objects — on top of the same mapping. This one does not, which is the
 * slot-level shape of "a record has no identity".
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see `ContextOf` in `@/domain/entity/types` — the entity counterpart.
 */
export type RecordContextOf<PropertiesShape extends RecordPropertiesShapeBase> =
	{
		[Key in RecordDomainKeys<PropertiesShape>]: PropertiesShape[Key]["prototype"];
	};
