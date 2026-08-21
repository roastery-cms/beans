import type { BoundRecord } from "@/domain/record/record";
import type { Properties } from "@roastery/terroir/symbols";
import type { RawRecordContextOf } from "./raw-record-context-of.type";
import type { RecordAccessorsOf } from "./record-accessors-of.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";
import type { SerializedRecord } from "./serialized-record.type";

/**
 * The **class** `recordOf` returns — not an instance.
 *
 * The annotation is load-bearing, for the same reason `EntityClassOf`'s is:
 * the class is declared *inside* the factory body, so without a named public
 * type the declaration build fails with **TS4060** (`Return type of exported
 * function has or is using private name`). `tsconfig.build.json` sets
 * `declaration: true` and `bun run build` runs `tsup --dts`, so an inferred
 * return type would simply not compile.
 *
 * The instance side is `BoundRecord<PropertiesShape> &
 * RecordAccessorsOf<PropertiesShape>`, and both halves are deliberate.
 * `BoundRecord` rather than `DomainRecord` because `DomainRecord.defineRecord`
 * is **abstract**: naming the abstract base here makes every `class X extends
 * recordOf(…) {}` fail with **TS2515**. And a real **class** type rather than
 * a synthesized object because that is what lets a subclass keep reaching the
 * `protected` members — `set` and `setMany`, which are the entire reason a
 * subclass exists.
 *
 * `demo` and `fromJSON` repeat the base's polymorphic-`this` signatures rather
 * than fixing a return type: instantiated at their constraint, a fixed return
 * would collapse to the base and `Money.demo()` would stop being a `Money`.
 *
 * @typeParam PropertiesShape - The blueprint shape the factory was given.
 *
 * @see `recordOf` in `@/domain/record/helpers/record-of` — the factory returning this shape.
 * @see {@link RecordAccessorsOf} — what a subclass would otherwise merge by hand.
 */
export type RecordClassOf<PropertiesShape extends RecordPropertiesShapeBase> = {
	/** Instance side: the base plus the blueprint-derived accessors, already typed. */
	readonly prototype: BoundRecord<PropertiesShape> &
		RecordAccessorsOf<PropertiesShape>;

	/** Mirrors the base constructor: the raw payload, with no identity half. */
	new (
		context: RawRecordContextOf<PropertiesShape>,
	): BoundRecord<PropertiesShape> & RecordAccessorsOf<PropertiesShape>;

	/**
	 * Inherited from the base: builds the record from its declared defaults.
	 *
	 * @returns An instance of the subclass the call was made on.
	 */
	demo<
		Self extends {
			readonly prototype: { [Properties]: RecordPropertiesShapeBase };
		},
	>(this: Self): Self["prototype"];

	/**
	 * Inherited from the base: strict hydration from a serialized payload.
	 *
	 * @param data - The serialized record.
	 * @returns An instance of the subclass the call was made on.
	 */
	fromJSON<
		Self extends {
			readonly prototype: { [Properties]: RecordPropertiesShapeBase };
		},
	>(this: Self, data: SerializedRecord<PropertiesShape>): Self["prototype"];
};
