/**
 * @module @roastery/beans/way/collections/value-objects/nullable
 *
 * Roastery Way alias onto
 * `@roastery/beans/domain/collections/value-objects/nullable` — the exact
 * same `Nullable*VO` classes, re-exported here so a `way`-built blueprint
 * reaches them from one path. Kept in sync by hand with the domain barrel
 * it mirrors; every name below is a straight re-export, not a copy.
 *
 * Re-exports: `NullableBooleanVO`, `NullableDateTimeVO`, `NullableEmailVO`,
 * `NullableNumberVO`, `NullablePasswordVO`, `NullableSimpleUrlVO`,
 * `NullableSlugVO`, `NullableStringVO`, `NullableStringArrayVO`,
 * `NullableUrlVO`, `NullableUuidArrayVO`, `NullableUuidVO` — each just the
 * required VO's schema plus `null`. Unlike `optional`, the blueprint key
 * stays required — the caller must pass `null` explicitly.
 */

export {
	NullableBooleanVO,
	NullableDateTimeVO,
	NullableDoubleVO,
	NullableEmailVO,
	NullableIntegerVO,
	NullableNegativeDoubleVO,
	NullableNegativeIntegerVO,
	NullableNegativeNumberVO,
	NullableNumberVO,
	NullablePasswordVO,
	NullablePositiveDoubleVO,
	NullablePositiveIntegerVO,
	NullablePositiveNumberVO,
	NullableSimpleUrlVO,
	NullableSlugVO,
	NullableStringArrayVO,
	NullableStringVO,
	NullableUrlVO,
	NullableUuidArrayVO,
	NullableUuidVO,
} from "@/domain/collections/value-objects/nullable";
