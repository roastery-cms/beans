import type { Meta } from "@roastery/terroir/symbols";

/**
 * Whether a blueprint property's class declared its values **sensitive**, as a
 * boolean literal.
 *
 * This is the type-level half of a declaration that used to exist only at
 * runtime: `defineMeta` is `protected` and only ever invoked on a probe, so
 * until `IValueObjectMetadata` carried the flag as a type parameter there was
 * nothing for a conditional type to read. Now the literal reaches the public
 * `[Meta]` slot, and `RepositoryFilterKeysOf` can drop the key before it ever
 * becomes a `findBy{Key}` / `findManyBy{Key}` method.
 *
 * **The `?` on `sensitive` is load-bearing.** The property is optional on
 * `IValueObjectMetadata`, so its real type is `true | undefined` — matched
 * against a *required* `{ sensitive: true }` the conditional never holds, and
 * every class silently reads as non-sensitive. Declaring it optional here is
 * what makes the match work; do not "tidy" it away.
 *
 * Only the value-object source is visible this way. The per-aggregate
 * `sensitive: [...]` list on `defineEntity` redacts and answers
 * `entity.isSensitive(key)`, but its literal does not survive into the class
 * type, so it cannot suppress anything — see `RepositoryFilterKeysOf`.
 *
 * @typeParam Candidate - The blueprint property class to inspect.
 *
 * @example
 * ```ts
 * IsSensitiveValueObjectClass<typeof PasswordVO>; // true
 * IsSensitiveValueObjectClass<typeof EmailVO>;    // false
 * ```
 *
 * @see `RepositoryFilterKeysOf` in `@roastery/beans/domain/repository/types` — its one consumer.
 */
export type IsSensitiveValueObjectClass<Candidate> = Candidate extends {
	readonly prototype: { readonly [Meta]: { readonly sensitive?: true } };
}
	? true
	: false;
