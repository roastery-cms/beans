/**
 * @module @roastery/beans/way/collections/value-objects/optional
 *
 * Roastery Way alias onto
 * `@roastery/beans/domain/collections/value-objects/optional` — the exact
 * same `Optional*VO` classes, re-exported here so a `way`-built blueprint
 * reaches them from one path. Kept in sync by hand with the domain barrel
 * it mirrors; every name below is a straight re-export, not a copy.
 *
 * Re-exports: `OptionalBooleanVO`, `OptionalDateTimeVO`, `OptionalEmailVO`,
 * `OptionalNumberVO`, `OptionalPasswordVO`, `OptionalSchemaVO`,
 * `OptionalSimpleUrlVO`,
 * `OptionalSlugVO`, `OptionalStringVO`, `OptionalStringArrayVO`,
 * `OptionalUrlVO`, `OptionalUuidArrayVO`, `OptionalUuidVO` — each just the
 * required VO's schema plus `undefined`, so the blueprint key becomes
 * omittable.
 */

export {
	OptionalBooleanVO,
	OptionalDateTimeVO,
	OptionalDoubleVO,
	OptionalEmailVO,
	OptionalIntegerVO,
	OptionalNegativeDoubleVO,
	OptionalNegativeIntegerVO,
	OptionalNegativeNumberVO,
	OptionalNumberVO,
	OptionalPasswordVO,
	OptionalPositiveDoubleVO,
	OptionalPositiveIntegerVO,
	OptionalPositiveNumberVO,
	OptionalSchemaVO,
	OptionalSimpleUrlVO,
	OptionalSlugVO,
	OptionalStringArrayVO,
	OptionalStringVO,
	OptionalUrlVO,
	OptionalUuidArrayVO,
	OptionalUuidVO,
} from "@/domain/collections/value-objects/optional";
