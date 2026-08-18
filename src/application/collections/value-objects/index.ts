/**
 * @module @roastery/beans/application/collections/value-objects
 *
 * Application-layer alias onto `@roastery/beans/domain/collections/value-objects`
 * — the exact same value-objects, re-exported here so a `Command` blueprint
 * never has to reach across into `@roastery/beans/domain` just to reuse one.
 * Kept in sync by hand with the domain barrel it mirrors; every name below is
 * a straight re-export, not a copy.
 *
 * Re-exports:
 * - {@link BooleanVO}       — boolean (`truthy()`, `falsy()`, `from()` sugar).
 * - {@link DateTimeVO}      — ISO 8601 timestamp (`now()` sugar).
 * - {@link EmailVO}         — email address.
 * - {@link NumberVO}        — non-negative number.
 * - {@link PasswordVO}      — password with complexity rules.
 * - {@link SimpleUrlVO}     — URI of any protocol.
 * - {@link SlugVO}          — URL-safe identifier (auto-slugifies via `transform`).
 * - {@link StringVO}        — string of any length (reuses `StringSchema`).
 * - {@link StringArrayVO}   — array of strings.
 * - {@link UrlVO}           — HTTP/HTTPS URL.
 * - {@link UuidArrayVO}     — array of UUIDs.
 * - {@link UuidVO}          — UUID (`generate()` produces v7).
 */

export {
	BooleanVO,
	DateTimeVO,
	EmailVO,
	NumberVO,
	PasswordVO,
	SimpleUrlVO,
	SlugVO,
	StringVO,
	StringArrayVO,
	UrlVO,
	UuidArrayVO,
	UuidVO,
} from "@/domain/collections/value-objects";
