import type { Properties } from "@roastery/terroir/symbols";
import type { IRawEntity } from "./raw-entity.interface";
import type { ReshapableModel } from "./reshapable-model.type";
import type { ReshapeShapeBase } from "./reshape-shape-base.type";
import type { ReshapedValuesOf } from "./reshaped-values-of.type";

/**
 * What `reshapeTo` returns: one serialized value per key of `Shape`, plus the
 * identity fields when — and only when — the source was an `Entity`.
 *
 * The identity question is answered by the source's own `toJSON`, not by a
 * flag or a second overload: `Entity#toJSON()` returns
 * `SerializedEntity<S> = IRawEntity & …` and `DomainRecord#toJSON()` returns
 * `SerializedRecord<S>`, which has no identity fields. So the discriminant is
 * already in the type the concrete class declares, and a record can never be
 * typed as carrying an `id` it does not have.
 *
 * The **source blueprint** is read off the instance the same way, through the
 * public `[Properties]` slot, because a target key may hold a nested reshape
 * shape rather than a class — and a nested shape states neither its
 * multiplicity nor its identity half, so both come from the source. That is why
 * this composes {@link ReshapedValuesOf} (two shapes) rather than
 * `SerializedValuesOf` (one); a target made only of classes resolves to exactly
 * what it resolved to before nested shapes existed.
 *
 * No branch of its own is needed for nested aggregates or wrappers:
 * {@link ReshapedValuesOf} maps each key through `ReshapedValueOf`, which
 * resolves a class target through `RawValueOf` and a nested-shape target
 * through `ProjectedOnto` — the same recursive cut `reshapeTo` performs at
 * runtime, with the same rule about where identity comes from.
 *
 * @typeParam Shape - The reshape target, whose keys the result is cut down to.
 * @typeParam Model - The source instance type, whose `toJSON` decides identity.
 *
 * @example
 * ```ts
 * type Card = ReshapedTo<typeof cardShape, Post>;
 * // { id: string; createdAt: string; updatedAt?: string; title: string; … }
 *
 * type MoneyCard = ReshapedTo<typeof amountShape, Money>;
 * // { amount: number } — a record brings no identity
 *
 * type WithTags = ReshapedTo<{ tags: typeof tagCard }, Post>;
 * // { id; createdAt; …; tags: readonly { id; createdAt; slug }[] }
 * // — the array comes from the source's `arrayOf`, not from the target
 * ```
 *
 * @see `reshapeTo` in `../helpers/reshape-to` — the function this types.
 * @see {@link ReshapedValuesOf} — the domain half, and where the two shapes meet.
 * @see {@link ReshapeShapeBase} — what a target may declare per key.
 */
export type ReshapedTo<
	Shape extends ReshapeShapeBase,
	Model extends ReshapableModel,
> =
	ReturnType<Model["toJSON"]> extends IRawEntity
		? IRawEntity & ReshapedValuesOf<Shape, Model[typeof Properties]>
		: ReshapedValuesOf<Shape, Model[typeof Properties]>;
