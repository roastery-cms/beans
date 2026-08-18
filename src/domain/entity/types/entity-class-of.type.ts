import type { BoundEntity } from "@/domain/entity/entity";
import type { Properties } from "@roastery/terroir/symbols";
import type { AccessorsOf } from "./accessors-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { RawContextOf } from "./raw-context-of.type";
import type { SerializedEntity } from "./serialized-entity.type";

/**
 * The **class** `entityOf` returns — not an instance.
 *
 * The annotation is load-bearing, for the same reason `ValueObjectClassOf`'s
 * is: the class is declared *inside* the factory body, so without a named
 * public type the declaration build fails with **TS4060** (`Return type of
 * exported function has or is using private name`). `tsconfig.build.json` sets
 * `declaration: true` and `bun run build` runs `tsup --dts`, so an inferred
 * return type would simply not compile.
 *
 * The instance side is `BoundEntity<PropertiesShape> &
 * AccessorsOf<PropertiesShape>`, and both halves of that are deliberate.
 * `BoundEntity` rather than `Entity` because `Entity.defineEntity` is
 * **abstract**: naming `Entity` here makes every `class X extends entityOf(…)
 * {}` fail with **TS2515**, since a type literal has no way to say the member
 * is already implemented. And a real **class** type rather than a synthesized
 * object because that is what lets a subclass keep reaching the `protected`
 * members (`raiseEvent`, `[Storage]`, `[Events]`) — the difference from the
 * lifecycle decorators, whose target is a generic type parameter and therefore
 * needs a cast to reach the same members.
 *
 * `demo` and `fromJSON` repeat the base's polymorphic-`this` signatures rather
 * than fixing a return type: instantiated at their constraint, a fixed return
 * would collapse to the base and `Author.demo()` would stop being an `Author`.
 *
 * @typeParam PropertiesShape - The blueprint shape the factory was given.
 *
 * @see `entityOf` in `@/domain/entity/helpers/entity-of` — the factory returning this shape.
 * @see {@link AccessorsOf} — what a subclass would otherwise have to merge by hand.
 */
export type EntityClassOf<PropertiesShape extends PropertiesShapeBase> = {
	/** Instance side: the base plus the blueprint-derived accessors, already typed. */
	readonly prototype: BoundEntity<PropertiesShape> &
		AccessorsOf<PropertiesShape>;

	/** Mirrors the base constructor: the raw payload, identity optional and all-or-nothing. */
	new (
		context: RawContextOf<PropertiesShape>,
	): BoundEntity<PropertiesShape> & AccessorsOf<PropertiesShape>;

	/**
	 * Inherited from the base: builds the entity from its declared defaults.
	 *
	 * @returns An instance of the subclass the call was made on.
	 */
	demo<
		Self extends {
			readonly prototype: { [Properties]: PropertiesShapeBase };
		},
	>(this: Self): Self["prototype"];

	/**
	 * Inherited from the base: strict hydration from a serialized payload.
	 *
	 * @param data - The serialized entity.
	 * @returns An instance of the subclass the call was made on.
	 */
	fromJSON<
		Self extends {
			readonly prototype: { [Properties]: PropertiesShapeBase };
		},
	>(this: Self, data: SerializedEntity<PropertiesShape>): Self["prototype"];
};
