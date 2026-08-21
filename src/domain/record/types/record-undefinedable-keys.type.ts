import type { UndefinedableKeys } from "@/domain/entity/types/undefinedable-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The record blueprint keys whose property class accepts `undefined` as an
 * input value — built with `optionalVO`, or any custom value-object whose
 * `ValueType` includes `undefined`. These are the keys a construction payload
 * may omit, on top of the ones a rule already covers.
 *
 * A named alias of `UndefinedableKeys`, whose two load-bearing properties
 * carry over unchanged and matter just as much here: only **value-object**
 * properties are considered (a nested entity or record is never itself
 * `undefined`), and the check reads `["prototype"]["value"]` directly rather
 * than routing through `InputValueOf`. That second point is what keeps
 * `RecordConstructionValuesOf` → `InputValueOf` → `NestedRecordInput` →
 * `RecordConstructionValuesOf` from becoming a circular mapped type for a
 * self-referencing record blueprint (`{ parent: Node }`). Such a blueprint is
 * still rejected at runtime, by `CyclicEntityDefinitionException`.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see {@link RecordConstructionValuesOf} — where these keys become optional.
 */
export type RecordUndefinedableKeys<
	PropertiesShape extends RecordPropertiesShapeBase,
> = UndefinedableKeys<PropertiesShape>;
