import type { AnyValueObjectClass } from "@/domain/entity/types/any-value-object-class.type";
import type { DomainKeys } from "@/domain/entity/types/domain-keys.type";
import type { RawValueOf } from "@/domain/entity/types/raw-value-of.type";
import type { IRawEntity, PropertiesShapeBase } from "@/domain/entity/types";
import type { RepositoryFilterKeysOf } from "./repository-filter-keys-of.type";

/**
 * The value one filter key is queried with: the **raw** value the key's
 * value-object wraps, or the identity field's own string.
 *
 * A repository is asked for `findByEmail("alan@roastery.dev")`, not
 * `findByEmail(new EmailVO(...))` — the caller of a port typically holds a
 * primitive that just came off a request, and forcing it through a
 * value-object first would put validation in the wrong place (the entity's
 * own construction already owns that).
 *
 * This is what kills the `repository.findBy("slug" as never, id as never)`
 * pattern a single generic `findBy(property, value)` forces: here the property
 * *is* the method name, and its value type is derived from the blueprint, so
 * neither argument needs a cast.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 * @typeParam Key - The filter key being read.
 *
 * @example
 * ```ts
 * const userProperties = { email: EmailVO };
 *
 * type ByEmail = RepositoryFilterValueOf<typeof userProperties, "email">; // string
 * type ById = RepositoryFilterValueOf<typeof userProperties, "id">; // string
 * type ByUpdatedAt = RepositoryFilterValueOf<typeof userProperties, "updatedAt">; // string | undefined
 * ```
 *
 * @see {@link RepositoryFilterKeysOf} — the keys this is defined over.
 */
export type RepositoryFilterValueOf<
	PropertiesShape extends PropertiesShapeBase,
	Key extends RepositoryFilterKeysOf<PropertiesShape>,
> = Key extends keyof IRawEntity
	? IRawEntity[Key]
	: Key extends DomainKeys<PropertiesShape>
		? PropertiesShape[Key] extends AnyValueObjectClass
			? RawValueOf<PropertiesShape[Key]>
			: never
		: never;
