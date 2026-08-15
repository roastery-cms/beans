import type { ConstructionValuesOf } from "./construction-values-of.type";
import type { IdentityInput } from "./identity-input.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * The constructor payload of an `Entity` subclass: every blueprint property's
 * raw input value, intersected with the all-or-nothing identity rule — omit
 * `id`/`createdAt`/`updatedAt` entirely for a fresh identity, or provide `id`
 * and `createdAt` together to preserve one.
 *
 * Properties that declared a rule in the blueprint are **optional** here: the
 * base fills them from their `default` or `derive`. On a plain blueprint every
 * property stays required, exactly as before.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see {@link IdentityInput} — the identity half of the intersection.
 * @see {@link ConstructionValuesOf} — the domain half, where the ruled keys
 *   become optional.
 */
export type RawContextOf<PropertiesShape extends PropertiesShapeBase> =
	ConstructionValuesOf<PropertiesShape> & IdentityInput;
