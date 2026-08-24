import type { Properties, Source } from "@roastery/terroir/symbols";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * What `reshapeTo` accepts as its source: anything that carries a blueprint,
 * names itself and can serialize — which is exactly `Entity` and
 * `DomainRecord`, and nothing else in the package.
 *
 * Written structurally, against the two symbol-keyed slots and `toJSON`,
 * rather than as `IEntity | IRecord`. Two reasons: a union would make the
 * `ReturnType<Model["toJSON"]>` discriminant in {@link ReshapedTo} resolve
 * against the union rather than the concrete subclass, and naming either
 * interface would tie a helper that is deliberately pillar-agnostic to one
 * pillar's vocabulary. The slots are public on both bases precisely so code
 * outside them can read a blueprint off an instance.
 *
 * `toJSON(): object` is the loosest useful constraint — {@link ReshapedTo}
 * inspects the *actual* return type of the concrete class, so narrowing it
 * here would only reject subclasses it then handles correctly.
 *
 * @example
 * ```ts
 * declare const post: Post;   // an Entity
 * declare const money: Money; // a DomainRecord
 * // both satisfy ReshapableModel — no import of either base involved
 * ```
 *
 * @see {@link ReshapedTo} — the return type computed from one of these.
 * @see `IEntity` in `./entity.interface` and `IRecord` in
 *   `@/domain/record/types/record.interface` — the two contracts that satisfy this.
 */
export type ReshapableModel = {
	/** Stable type identifier (e.g. `"post"`), used as the exception's `source`. */
	readonly [Source]: string;

	/** The blueprint the instance was built from, read to check conformance. */
	readonly [Properties]: PropertiesShapeBase;

	/** The lossless serialized form the projection is cut out of. */
	toJSON(): object;
};
