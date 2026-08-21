import { isValueObject } from "./is-value-object";

/**
 * Serializes one built blueprint property: the wrapped `value` for a
 * value-object, `toJSON()` for a nested entity or record.
 *
 * Shared by every pillar that can hold a nested aggregate, because the
 * question it answers — "what is the raw form of this built property?" — has
 * one answer regardless of who is asking. It is also the reason neither
 * `toJSON` nor `setMany`'s change detection needs a branch of its own: both go
 * through here.
 *
 * The discriminant is **value-object or not**, never entity-versus-record: the
 * two nested kinds serialize identically, and only schema derivation ever has
 * to tell them apart.
 *
 * @param property - The built instance.
 * @returns Its raw form.
 *
 * @see `isValueObject` in `./is-value-object` — the structural discriminant.
 */
export function rawOf(property: unknown): unknown {
	return isValueObject(property)
		? property.value
		: (property as { toJSON(): unknown }).toJSON();
}
