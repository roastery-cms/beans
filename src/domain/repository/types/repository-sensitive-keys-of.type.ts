import type { PropertiesShapeBase } from "@/domain/entity/types";
import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyValueObjectClass } from "@/domain/entity/types/any-value-object-class.type";
import type { DomainKeys } from "@/domain/entity/types/domain-keys.type";
import type { IsSensitiveValueObjectClass } from "@/domain/value-object/types/is-sensitive-value-object-class.type";

/**
 * The blueprint keys whose value-object declared itself sensitive — exactly the
 * set {@link RepositoryFilterKeysOf} drops, stated positively.
 *
 * The two are written as one mapped type each rather than one deriving from the
 * other, because they are not complements: `RepositoryFilterKeysOf` also drops
 * nested entities and also *adds* the three identity fields, so `Exclude`-ing
 * one from the other would quietly pick up `profile` and lose `id`.
 *
 * Only the value-object source is visible here, for the same reason it is the
 * only one `RepositoryFilterKeysOf` can act on: the per-aggregate
 * `sensitive: [...]` list on `defineEntity` is a value whose literal never
 * reaches the class type.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @example
 * ```ts
 * const userProperties = { name: StringVO, password: PasswordVO };
 *
 * type Secret = RepositorySensitiveKeysOf<typeof userProperties>; // "password"
 * ```
 *
 * @see {@link RepositorySuppressedNamesOf} — the method names built from these.
 */
export type RepositorySensitiveKeysOf<
	PropertiesShape extends PropertiesShapeBase,
> = {
	[Key in DomainKeys<PropertiesShape>]: PropertiesShape[Key] extends AnyEntityClass
		? never
		: PropertiesShape[Key] extends AnyRecordClass
			? never
			: PropertiesShape[Key] extends AnyValueObjectClass
				? IsSensitiveValueObjectClass<PropertiesShape[Key]> extends true
					? Key
					: never
				: never;
}[DomainKeys<PropertiesShape>];
