/**
 * Whether two **built** blueprint properties are equal — the one traversal
 * step every by-value comparison in the package takes.
 *
 * It decides nothing itself. Each of the four property kinds carries its own
 * `equals`, and each answers with its own pillar's rule: a value-object by its
 * value, an `Entity` **by its id**, a `DomainRecord` by its properties, a
 * wrapper item by item. Delegating is the whole point — comparing a nested
 * aggregate structurally instead would drag `createdAt` and `updatedAt` into
 * an answer that has nothing to do with either.
 *
 * **The left side is never absent, and that is a guarantee rather than an
 * assumption.** `buildContext` fills one built instance per blueprint key on
 * every construction path, including demo mode: a key that resolved to nothing
 * still holds a value-object wrapping `undefined`, which is why an
 * `optionalVO` key compares like any other. The only `undefined` slot an
 * entity's `[Context]` ever has is `updatedAt`, and that is not a blueprint
 * key. Every caller also checks the exact class first, so the right side has
 * the same keys as the left.
 *
 * Shared rather than duplicated for the reason `propertyMatches` is: two
 * consumers now ask this question — a blueprint owner over its keys, and a
 * wrapper over its items — and two copies would only guarantee that a fix to
 * one silently misses the other.
 *
 * @param a - The left built property.
 * @param b - The right built property.
 * @returns Whatever `a.equals(b)` says.
 *
 * @example
 * ```ts
 * propertyEquals(new StringVO("a", ctx), new StringVO("a", ctx)); // true
 * propertyEquals(author, otherAuthor); // compares by id — `author` is an Entity
 * ```
 *
 * @see `Entity.sameStateAs` in `@/domain/entity/entity` — the by-state half of
 *   the entity's pair, and the reason this delegates instead of recursing.
 * @see `propertyMatches` in `./property-matches` — the sibling asking the
 *   shape question rather than the value one.
 */
export function propertyEquals(a: unknown, b: unknown): boolean {
	return (a as { equals(other: unknown): boolean }).equals(b);
}
