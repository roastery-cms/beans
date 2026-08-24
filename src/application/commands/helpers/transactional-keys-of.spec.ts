import { Command } from "@/application/command";
import { transactional } from "@/application/command/decorators";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { NumberVO } from "@/domain/collections/value-objects";
import { describe, expect, it } from "bun:test";
import { transactionalKeysOf } from "./transactional-keys-of";

const properties = { total: NumberVO };

@transactional
class PlaceOrder extends Command<typeof properties, void, number> {
	protected defineCommand(): CommandDefinition<typeof properties> {
		return { properties, source: "place-order" };
	}

	public async execute(): Promise<CommandResult<number>> {
		return { result: this.get("total"), events: [] };
	}
}

@transactional
class CancelOrder extends Command<typeof properties, void, number> {
	protected defineCommand(): CommandDefinition<typeof properties> {
		return { properties, source: "cancel-order" };
	}

	public async execute(): Promise<CommandResult<number>> {
		return { result: this.get("total"), events: [] };
	}
}

class FindOrder extends Command<typeof properties, void, number> {
	protected defineCommand(): CommandDefinition<typeof properties> {
		return { properties, source: "find-order" };
	}

	public async execute(): Promise<CommandResult<number>> {
		return { result: this.get("total"), events: [] };
	}
}

describe("transactionalKeysOf", () => {
	it("reports only the marked keys, in the spec's own order", () => {
		const keys = transactionalKeysOf({
			placeOrder: PlaceOrder,
			findOrder: FindOrder,
			cancelOrder: CancelOrder,
		});

		expect(keys).toEqual(["placeOrder", "cancelOrder"]);
	});

	it("returns an empty list when nothing is marked — the ordinary case", () => {
		expect(transactionalKeysOf({ findOrder: FindOrder })).toEqual([]);
		expect(transactionalKeysOf({})).toEqual([]);
	});

	it("answers before withDependencies, so a bootstrap check can still change the wiring", () => {
		const spec = { placeOrder: PlaceOrder, findOrder: FindOrder };
		const transaction = undefined;

		const check = () => {
			if (!transaction && transactionalKeysOf(spec).length > 0)
				throw new Error("transactional commands registered without a runner");
		};

		expect(check).toThrow("transactional commands registered without a runner");
	});
});
