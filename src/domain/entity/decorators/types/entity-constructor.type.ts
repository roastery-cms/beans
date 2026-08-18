import type { Source } from "@roastery/terroir/symbols";

/**
 * The subset of `Entity`'s instance shape every lifecycle decorator actually
 * touches: the `source` used as validation context, `isDestroyed` (which
 * `onDelete` reads before delegating), and the two public mutators they wrap
 * — `setMany`, whose `boolean` return is the signal `onUpdate` reads to tell
 * a real mutation from a no-op, and `destroy`.
 *
 * Deliberately **not** `Entity<PropertiesShapeBase>` itself: that generic
 * instance type's `toJSON()`/`get()` return types are shape-dependent in a
 * way that makes a concrete `Entity<SomeShape>`'s construct signature
 * structurally incompatible with `Entity<PropertiesShapeBase>`'s (the
 * aggregate `SerializedEntity<PropertiesShapeBase>` needs a string index
 * signature a concrete blueprint's serialized shape doesn't have) — so
 * pinning the mixin base to the full generic type would make every decorated
 * subclass fail to type-check against its own concrete blueprint. This
 * narrower, blueprint-independent slice sidesteps that entirely.
 */
type EntityLike = {
	readonly [Source]: string;
	readonly isDestroyed: boolean;
	setMany(values: Record<string, unknown>): boolean;
	destroy(): void;
};

/**
 * Widest `Entity` **constructor** type a lifecycle decorator can wrap — the
 * standard TypeScript mixin-parameter shape (`(...args: any[])`, required by
 * the compiler's own mixin rules, not a loosening this package chose). Any
 * concrete `Entity` subclass's constructor, whatever its actual payload
 * type, is assignable here.
 *
 * Internal to the decorators pillar: every lifecycle decorator constrains
 * its generic class parameter against this, so the class it returns still
 * satisfies whatever the caller declared (`Entity<typeof xProperties>`), not
 * just the widened shape used while building the wrapper.
 */
export type EntityConstructor = abstract new (
	// biome-ignore lint/suspicious/noExplicitAny: TS's mixin pattern requires the base constructor type's rest parameter to be exactly `any[]` — see TS2545.
	...args: any[]
) => EntityLike;
