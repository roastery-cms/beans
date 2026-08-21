import type { DomainKeys } from "@/domain/entity/types/domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The domain property keys of a record blueprint — its string keys, excluding
 * the symbol slot a ruled blueprint carries its rules under.
 *
 * Every mapped type over a record blueprint goes through this instead of bare
 * `keyof`, for the reason `DomainKeys` documents: the rules are metadata about
 * the properties, not a property, so they must not surface as an accessor, a
 * schema field, a serialized key or a construction argument.
 *
 * A named alias of `DomainKeys`, since the filtering rule is a property of the
 * blueprint shape and not of the pillar reading it.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see `Rules` in `@roastery/terroir/symbols` — the key filtered out.
 */
export type RecordDomainKeys<
	PropertiesShape extends RecordPropertiesShapeBase,
> = DomainKeys<PropertiesShape>;
