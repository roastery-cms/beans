/**
 * Whether a raw input value is **already** an instance of the blueprint class
 * it is being built into — the case where the caller handed over a nested
 * entity, record or wrapper it had constructed itself instead of that class's
 * serialized form.
 *
 * The three build sites (`Entity`'s and `DomainRecord`'s `buildProperty`, the
 * wrapper's `buildItem`) adopt such a value rather than reconstructing it. The
 * type system already accepts the instance at those boundaries — a built
 * entity satisfies its own input form structurally — so before the adoption
 * the runtime was the half that disagreed, and it disagreed in silence:
 * reconstructing from an instance reads back nothing but the identity, so an
 * item whose keys all carry rules came back filled with defaults, and any
 * event the instance had buffered was dropped with the instance itself.
 *
 * Only value-object classes are excluded, and the discriminant lives at the
 * call sites (`isValueObjectClass`) rather than here: the raw input of a
 * value-object key is its *wrapped value*, never the instance, so there is
 * nothing to adopt.
 *
 * @remarks
 * **The test is `instanceof`, so a subclass is adopted too** — the same ruler
 * `propertyMatches` and `entityHas` hold up to a blueprint key, where taking a
 * domain-vocabulary subclass is the whole point. `equals` holds up the other
 * one, the exact prototype, because anything looser is asymmetric. So a
 * `DraftAuthor extends Author` crosses this boundary without a word and then
 * compares equal to no plain `Author` — the one seam where the package's two
 * rulers point opposite ways. Neither is wrong for its own question; see
 * `docs/decisions/adoption-over-rebuild.md`.
 *
 * @param propertyClass - The blueprint class the value is being built into.
 * @param value - The raw input value.
 * @returns `true` when the value is already an instance of that class.
 *
 * @example
 * ```ts
 * // Inside `buildProperty`, before reaching for `new`:
 * if (isBuiltInstance(propertyClass, value)) return value;
 * ```
 *
 * @see `buildItem` in `@/domain/wrapper/helpers/build-item` — the per-item
 *   build site, where this is what preserves an appended item's identity.
 * @see `propertyEquals` in `./property-equals` — the other ruler, and the
 *   reason a subclass adopted here compares equal to nothing.
 */
export function isBuiltInstance(
	propertyClass: unknown,
	value: unknown,
): boolean {
	return (
		typeof propertyClass === "function" &&
		value instanceof (propertyClass as new (...args: never[]) => unknown)
	);
}
