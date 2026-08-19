/**
 * Upper-cases a blueprint key's first character, matching what TypeScript's
 * own `Capitalize<>` does to the same key at the type level.
 *
 * This is the runtime half of the naming rule `RepositoryReadMethodsOf` states
 * as a type: `email` becomes the `findByEmail` in
 * `` `findBy${Capitalize<Key>}` ``. The two have to agree exactly, or the
 * generated object would carry a method the port's type never declared.
 *
 * Reads the first character with `charAt`, not `key[0]`: under
 * `noUncheckedIndexedAccess` the index form is `string | undefined`, and the
 * template would happily interpolate `"undefined"` into a method name.
 *
 * The agreement holds for ASCII, which every blueprint key in practice is.
 * A key starting with a character whose `toUpperCase()` differs from
 * TypeScript's intrinsic `Capitalize<>` would drift — documented rather than
 * guarded against, since the guard would cost more than the case is worth.
 *
 * @param key - The blueprint key, e.g. `"email"`.
 * @returns The key with its first character upper-cased, e.g. `"Email"`.
 *
 * @example
 * ```ts
 * capitalizeKey("email"); // "Email"
 * capitalizeKey("createdAt"); // "CreatedAt"
 * capitalizeKey(""); // ""
 * ```
 *
 * @see `RepositoryReadMethodsOf` in `@roastery/beans/domain/repository/types` — the type this mirrors.
 */
export function capitalizeKey(key: string): string {
	return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}
