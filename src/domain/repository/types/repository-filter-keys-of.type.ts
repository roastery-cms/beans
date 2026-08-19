import type { IRawEntity, PropertiesShapeBase } from "@/domain/entity/types";
import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { AnyValueObjectClass } from "@/domain/entity/types/any-value-object-class.type";
import type { DomainKeys } from "@/domain/entity/types/domain-keys.type";

/**
 * Every blueprint key a generated repository may be asked to filter by: the
 * value-object-backed domain keys, plus the three identity fields the `Entity`
 * base stamps on (`id`, `createdAt`, `updatedAt`).
 *
 * **Nested entities are excluded.** A repository filters by the `UuidVO` that
 * *references* an aggregate, never by the aggregate itself —
 * `findByAuthor(author)` would mean handing a whole object graph to a query
 * builder as a predicate. Declare `authorId: UuidVO` in the blueprint and
 * filter by that.
 *
 * The identity fields come in for free, which is what makes `findById` fall
 * out of the same generator as every other key instead of needing a
 * hand-written special case: `Capitalize<"id">` is `"Id"`, and
 * `IRawEntity["id"]` is `string`.
 *
 * Goes through {@link DomainKeys}, never bare `keyof`: a ruled blueprint
 * carries its rules under a symbol slot, and bare `keyof` would surface that
 * slot as a repository method.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @example
 * ```ts
 * const userProperties = { name: StringVO, email: EmailVO, profile: Profile };
 *
 * type Keys = RepositoryFilterKeysOf<typeof userProperties>;
 * // "name" | "email" | "id" | "createdAt" | "updatedAt" — never "profile"
 * ```
 *
 * @see {@link RepositoryCollectionFilterKeysOf} — the same set minus `id`.
 * @see {@link RepositoryFilterValueOf} — the value type each key filters on.
 */
export type RepositoryFilterKeysOf<
	PropertiesShape extends PropertiesShapeBase,
> =
	| {
			[Key in DomainKeys<PropertiesShape>]: PropertiesShape[Key] extends AnyEntityClass
				? never
				: PropertiesShape[Key] extends AnyValueObjectClass
					? Key
					: never;
	  }[DomainKeys<PropertiesShape>]
	| keyof IRawEntity;
