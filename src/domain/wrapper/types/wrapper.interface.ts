import type { IDomainEvent } from "@/domain/domain-event/types";
import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { t } from "@roastery/terroir";
import type { WrappedRawOf } from "./wrapped-raw-of.type";
import type { WrappedReadOf } from "./wrapped-read-of.type";
import type { WrapperKind } from "./wrapper-kind.type";

/**
 * The instance contract of a generated multiplicity wrapper: a container that
 * behaves, to every traversal in the package, exactly as a nested record does
 * — it serializes through `toJSON`, redacts through `toSafeJSON`, exposes its
 * derived `schema`, and forwards a deep domain-event drain to whatever it
 * holds — plus the one thing that is its own, `unwrap()`.
 *
 * That structural sameness is the whole reason the feature is cheap: almost no
 * runtime in the package discriminates the three property kinds, only
 * value-object versus not, so a wrapper crosses `buildProperty`, `rawOf`,
 * `toSafeJSON`, `pullDomainEvents` and `setMany`'s change detection without a
 * single branch of its own.
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @see {@link WrapperClassOf} — the class side, carrying the two statics.
 */
export interface IWrapper<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
> {
	/**
	 * The contents, unwrapped: the built instances for a wrapped entity or
	 * record, the raw values for a wrapped value-object.
	 *
	 * @returns The contents, under the declared multiplicity.
	 */
	unwrap(): WrappedReadOf<Kind, Inner>;

	/**
	 * Serializes the container. **Never redacts**, like `Entity.toJSON` and
	 * `DomainRecord.toJSON` — it is the persistence contract and has to
	 * round-trip.
	 *
	 * @returns The serialized contents.
	 */
	toJSON(): WrappedRawOf<Kind, Inner>;

	/**
	 * The same shape {@link IWrapper.toJSON} produces, with each item applying
	 * its **own** declared sensitive keys.
	 *
	 * A wrapper declares none of its own: it has no blueprint, so there is no
	 * key of its to mark. A wrapped value-object therefore surfaces its value
	 * here — the same limitation an entity- or record-valued key already has
	 * when the *owner* names it in `sensitive: [...]`.
	 *
	 * @returns The serialized contents, each item redacted by its own rules.
	 */
	toSafeJSON(): WrappedRawOf<Kind, Inner>;

	/**
	 * Whether another container holds the same contents: the same number of
	 * items, each equal to the item at the same index. **Order-sensitive** — a
	 * wrapper is a sequence, not a set.
	 *
	 * Each item answers with its own pillar's rule, so a wrapped entity
	 * compares by its `id` rather than by its state.
	 *
	 * @param other - Anything. A container minted by a different `arrayOf` /
	 *   `optionalOf` / `nullableOf` call is not equal.
	 * @returns `true` when both hold the same items, in the same order.
	 */
	equals(other: unknown): boolean;

	/** The derived schema: `t.Array` / `t.Union` over the inner class's own. */
	readonly schema: t.TSchema;

	/**
	 * Forwards a **deep** domain-event drain to each item, concatenating in
	 * order. The shallow form always returns `[]` — a wrapper raises nothing.
	 *
	 * Without this forward, an entity inside an `arrayOf` would keep its events
	 * forever, which is the single easiest thing to lose silently in the whole
	 * feature.
	 *
	 * @param options - `deep: true` walks into the items.
	 * @returns The drained events, or `[]`.
	 */
	pullDomainEvents(options?: {
		readonly deep?: boolean;
	}): readonly IDomainEvent[];
}
