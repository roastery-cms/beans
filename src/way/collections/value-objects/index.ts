/**
 * @module @roastery/beans/way/collections/value-objects
 *
 * Roastery Way alias onto `@roastery/beans/domain/collections/value-objects`
 * — the exact same value-objects, re-exported here so a `way`-built
 * blueprint reaches them from one path instead of into `@roastery/beans/domain`
 * directly. Kept in sync by hand with the domain barrel it mirrors, the same
 * way `@roastery/beans/application/collections/value-objects` already is;
 * every name below is a straight re-export, not a copy.
 *
 * Re-exports:
 * - {@link BooleanVO}         — boolean (`truthy()`, `falsy()`, `from()` sugar).
 * - {@link DateTimeVO}        — ISO 8601 timestamp (`now()` sugar).
 * - {@link DoubleVO}          — fixed-precision decimal of either sign (rounds to 2 places via `transform`).
 * - {@link EmailVO}           — email address.
 * - {@link IntegerVO}         — whole number of either sign (truncates via `transform`).
 * - {@link NegativeDoubleVO}  — fixed-precision decimal `<= 0`.
 * - {@link NegativeIntegerVO} — whole number `<= 0`.
 * - {@link NegativeNumberVO}  — number `<= 0`.
 * - {@link NumberVO}          — number of any sign.
 * - {@link PasswordVO}        — password with complexity rules.
 * - {@link PositiveDoubleVO}  — fixed-precision decimal `>= 0`.
 * - {@link PositiveIntegerVO} — whole number `>= 0`.
 * - {@link PositiveNumberVO}  — number `>= 0`.
 * - {@link SchemaVO}          — JSON-serialized TypeBox schema, checked to compile.
 * - {@link SimpleUrlVO}       — URI of any protocol.
 * - {@link SlugVO}            — URL-safe identifier (auto-slugifies via `transform`).
 * - {@link StringVO}          — string of any length (reuses `StringSchema`).
 * - {@link StringArrayVO}     — array of strings.
 * - {@link UrlVO}             — HTTP/HTTPS URL.
 * - {@link UuidArrayVO}       — array of UUIDs.
 * - {@link UuidVO}            — UUID (`generate()` produces v7).
 */

export {
	BooleanVO,
	DateTimeVO,
	DoubleVO,
	EmailVO,
	IntegerVO,
	NegativeDoubleVO,
	NegativeIntegerVO,
	NegativeNumberVO,
	NumberVO,
	PasswordVO,
	PositiveDoubleVO,
	PositiveIntegerVO,
	PositiveNumberVO,
	SchemaVO,
	SimpleUrlVO,
	SlugVO,
	StringArrayVO,
	StringVO,
	UrlVO,
	UuidArrayVO,
	UuidVO,
} from "@/domain/collections/value-objects";
