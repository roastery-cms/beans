import type { Source } from "@roastery/terroir/symbols";

/**
 * The subset of `Entity`'s instance shape `onCreate`/`onDelete` actually
 * touch: the `source` used as validation context, `isDestroyed` (which
 * `onDelete` reads before delegating) and `destroy` itself.
 *
 * Deliberately excludes `setMany`, even though `onUpdate` also builds its
 * wrapper on this same `EntityConstructor`/`EntityLike` pair: `setMany` is
 * `protected` on `Entity`, and a structural type/interface has no way to
 * express "protected" — declaring it here as a plain member would make
 * every concrete `Entity` subclass fail this bound (`Property 'setMany' is
 * protected in type 'X' but public in type 'EntityLike'`), breaking
 * `onCreate`/`onDelete` for classes that never even touch `setMany`.
 * `onUpdate` instead reaches it through a local cast, scoped to its own
 * file — see `on-update.decorator.ts`.
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
export type EntityLike = {
	readonly [Source]: string;
	readonly isDestroyed: boolean;
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
