import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { recordOf } from "@/domain/record";
import { arrayOf, optionalOf } from "@/domain/wrapper/helpers";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";
import { commandOf, collectDomainEvents } from "../helpers";
import type { CommandResult } from "./index";
import type { CommandSchemaOf } from "./command-schema-of.type";

/** Invariant type equality — see `record-type-parity.spec.ts`. */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

function assertEqual<_T extends true>(): void {}

class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"command-schema-money",
) {}

const LabelList = arrayOf(StringVO);
const MaybeMoney = optionalOf(Money);

const properties = {
	title: StringVO,
	total: Money,
	labels: LabelList,
	discount: MaybeMoney,
};

class PlaceOrder extends commandOf<typeof properties, void, string>(
	properties,
	"command-schema-place-order",
) {
	public async execute(): Promise<CommandResult<string>> {
		return await Promise.resolve({
			result: this.title,
			events: collectDomainEvents(),
		});
	}
}

describe("CommandSchemaOf", () => {
	type Properties = CommandSchemaOf<typeof properties>["properties"];

	it("resolves a record-valued key instead of collapsing to never", () => {
		assertEqual<
			Equal<[Properties["total"]] extends [never] ? true : false, false>
		>();

		expect(true).toBe(true);
	});

	it("resolves a wrapped key, under its multiplicity", () => {
		assertEqual<
			Equal<[Properties["labels"]] extends [never] ? true : false, false>
		>();
		assertEqual<
			Equal<Properties["labels"] extends t.TArray<t.TSchema> ? true : false, true>
		>();
		assertEqual<
			Equal<[Properties["discount"]] extends [never] ? true : false, false>
		>();

		expect(true).toBe(true);
	});

	it("agrees with the schema the runtime actually derives", () => {
		const command = new PlaceOrder({
			title: "one",
			total: { amount: 10, currency: "BRL" },
			labels: ["a", "b"],
		});

		expect(command.schema.properties.labels.type).toBe("array");
		expect(command.schema.properties.total.type).toBe("object");
	});
});
