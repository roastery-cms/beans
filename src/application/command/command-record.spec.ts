import { describe, expect, it } from "bun:test";
import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { recordOf } from "@/domain/record";
import { BadRequestException } from "@roastery/terroir/exceptions/application";
import { collectDomainEvents, commandOf } from "./helpers";
import type { CommandResult } from "./types";

const SecretVO = customStringVO({ name: "SecretVO", sensitive: true });

class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"money",
) {
	public isFree(): boolean {
		return this.amount === 0;
	}
}

class Card extends recordOf({ holder: StringVO, pin: SecretVO }, "card") {}

const properties = { label: StringVO, total: Money, card: Card };

class PlaceOrder extends commandOf<typeof properties, void, string>(
	properties,
	"place-order",
) {
	public async execute(): Promise<CommandResult<string>> {
		return await Promise.resolve({
			result: `${this.label}:${this.total.amount}`,
			events: collectDomainEvents(),
		});
	}
}

describe("Command with a record-valued key", () => {
	const payload = {
		label: "one",
		total: { amount: 10, currency: "BRL" },
		card: { holder: "alan", pin: "1234" },
	};

	it("builds the record and returns the instance from the accessor", () => {
		const command = new PlaceOrder(payload);

		expect(command.total).toBeInstanceOf(Money);
		expect(command.total.amount).toBe(10);
		expect(command.total.isFree()).toBe(false);
	});

	it("derives a schema that recurses into the record without identity", () => {
		const command = new PlaceOrder(payload);
		const total = command.schema.properties.total as unknown as {
			properties: Record<string, unknown>;
		};

		expect(Object.keys(total.properties).sort()).toEqual([
			"amount",
			"currency",
		]);
	});

	it("redacts through the nested record's own declared keys", () => {
		const serialized = new PlaceOrder(payload).toJSON() as unknown as {
			card: { holder: string; pin: string };
		};

		expect(serialized.card.holder).toBe("alan");
		expect(serialized.card.pin).not.toBe("1234");
	});

	it("hydrates strictly, rejecting an extra key inside the record", () => {
		expect(() =>
			PlaceOrder.fromJSON({
				...payload,
				total: { amount: 10, currency: "BRL", extra: 1 },
			} as unknown as Parameters<typeof PlaceOrder.fromJSON>[0]),
		).toThrow(BadRequestException);
	});

	it("still runs end to end", async () => {
		const { result } = await new PlaceOrder(payload).execute();

		expect(result).toBe("one:10");
	});
});
