import { describe, expect, it } from "bun:test";
import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { OptionalStringVO } from "@/domain/collections/value-objects/optional";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type { PropertiesShapeBase, RulesOf } from "@/domain/entity/types";
import type { ConstructionValuesOf } from "@/domain/entity/types/construction-values-of.type";
import type { InputValuesOf } from "@/domain/entity/types/input-values-of.type";
import type { SerializedValuesOf } from "@/domain/entity/types/serialized-values-of.type";
import type { DomainKeys } from "@/domain/entity/types/domain-keys.type";
import type { RuledKeys } from "@/domain/entity/types/ruled-keys.type";
import type { RawValueOf } from "@/domain/entity/types/raw-value-of.type";
import type { SetHandlerOf } from "@/domain/entity/types/set-handler-of.type";
import type { SetHandlersOf } from "@/domain/entity/types/set-handlers-of.type";
import type { UndefinedableKeys } from "@/domain/entity/types/undefinedable-keys.type";
import { recordOf } from "../helpers";
import type {
	RecordPropertiesShapeBase,
	RecordRulesOf,
	RecordSetHandlerOf,
	RecordSetHandlersOf,
	SerializedRecord,
} from "./index";
import type { RecordConstructionValuesOf } from "./record-construction-values-of.type";
import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordInputValuesOf } from "./record-input-values-of.type";
import type { RecordRawValueOf } from "./record-raw-value-of.type";
import type { RecordRuledKeys } from "./record-ruled-keys.type";
import type { RecordUndefinedableKeys } from "./record-undefinedable-keys.type";

/**
 * Invariant type equality — the standard mutually-assignable-conditional
 * trick, which distinguishes `any` and optionality where a bare
 * `extends`-both-ways does not.
 */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

/** Compiles only when the parameter is exactly `true`. */
function assertEqual<_T extends true>(): void {}

class Note extends entityOf({ text: StringVO }, "parity-note") {}
class Inner extends recordOf({ n: IntegerVO }, "parity-inner") {}

const sample = blueprint({
	amount: IntegerVO,
	note: OptionalStringVO,
	author: Note,
	inner: Inner,
}).with({ amount: { default: 0 } });

type Sample = typeof sample;

describe("record/entity type parity", () => {
	/**
	 * The record pillar spells several of its types as named aliases of the
	 * entity pillar's rather than as second definitions — see the barrel's
	 * TSDoc for why. These assertions are what makes that safe: if either side
	 * ever gains a branch the other lacks, this file stops compiling instead of
	 * silently letting a record nested in an entity mean something different
	 * from the same record built on its own.
	 *
	 * The types that genuinely diverge (everything touching identity) are
	 * deliberately absent here — asserting those equal would be asserting the
	 * pillar has no reason to exist.
	 */
	it("keeps the shared blueprint vocabulary identical", () => {
		assertEqual<Equal<RecordPropertiesShapeBase, PropertiesShapeBase>>();
		assertEqual<Equal<RecordDomainKeys<Sample>, DomainKeys<Sample>>>();
		assertEqual<Equal<RecordRuledKeys<Sample>, RuledKeys<Sample>>>();
		assertEqual<
			Equal<RecordUndefinedableKeys<Sample>, UndefinedableKeys<Sample>>
		>();
		assertEqual<
			Equal<RecordConstructionValuesOf<Sample>, ConstructionValuesOf<Sample>>
		>();
		assertEqual<Equal<RecordInputValuesOf<Sample>, InputValuesOf<Sample>>>();
		assertEqual<Equal<SerializedRecord<Sample>, SerializedValuesOf<Sample>>>();
		assertEqual<
			Equal<RecordRawValueOf<typeof Inner>, RawValueOf<typeof Inner>>
		>();
		assertEqual<Equal<RecordRulesOf<Sample>, RulesOf<Sample>>>();
		assertEqual<Equal<RecordSetHandlersOf<Sample>, SetHandlersOf<Sample>>>();
		assertEqual<
			Equal<
				RecordSetHandlerOf<Sample, typeof Inner>,
				SetHandlerOf<Sample, typeof Inner>
			>
		>();

		expect(true).toBe(true);
	});

	it("resolves the same omissions at runtime as the type promises", () => {
		class Parity extends recordOf(sample, "parity") {}

		// `amount` is ruled and `note` accepts undefined, so both are omittable —
		// exactly the two keys `RecordConstructionValuesOf` marks optional.
		const built = new Parity({ author: { text: "t" }, inner: { n: 1 } });

		expect(built.amount).toBe(0);
		expect(built.note).toBeUndefined();
	});
});
