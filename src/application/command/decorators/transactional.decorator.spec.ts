import { Command } from "@/application/command";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { NumberVO } from "@/domain/collections/value-objects";
import { describe, expect, it } from "bun:test";
import { isTransactional } from "./helpers/is-transactional";
import { transactional } from "./transactional.decorator";

const properties = { total: NumberVO };

class BareCommand extends Command<typeof properties, void, number> {
	protected defineCommand(): CommandDefinition<typeof properties> {
		return { properties, source: "bare" };
	}

	public async execute(): Promise<CommandResult<number>> {
		return { result: this.get("total"), events: [] };
	}
}

@transactional
class MarkedCommand extends Command<typeof properties, void, number> {
	protected defineCommand(): CommandDefinition<typeof properties> {
		return { properties, source: "marked" };
	}

	public async execute(): Promise<CommandResult<number>> {
		return { result: this.get("total"), events: [] };
	}
}

class SubclassOfMarked extends MarkedCommand {}

describe("transactional", () => {
	it("stamps the marker on the decorated class", () => {
		expect(isTransactional(MarkedCommand)).toBe(true);
		expect(isTransactional(BareCommand)).toBe(false);
	});

	it("returns the very same class, so identity and instanceof are untouched", async () => {
		const command = new MarkedCommand({ total: 3 });

		expect(command).toBeInstanceOf(MarkedCommand);
		expect(command).toBeInstanceOf(Command);
		expect(MarkedCommand.name).toBe("MarkedCommand");

		const { result } = await command.execute();

		expect(result).toBe(3);
	});

	it("changes nothing about how the command runs on its own", async () => {
		const marked = await new MarkedCommand({ total: 7 }).execute();
		const bare = await new BareCommand({ total: 7 }).execute();

		expect(marked).toEqual(bare);
	});

	it("keeps the marker non-enumerable, so it never reaches a spread or Object.keys", () => {
		expect(Object.keys(MarkedCommand)).not.toContain("transactional");
		expect({ ...MarkedCommand }).not.toHaveProperty("transactional");
	});

	it("is inherited by a subclass, the same way `static readonly definition` is", () => {
		expect(isTransactional(SubclassOfMarked)).toBe(true);
	});

	it("reads a hand-written static exactly as it reads a decorated class", () => {
		// biome-ignore lint/complexity/noStaticOnlyClass: the static-only shape is the subject — this is what a class declaring the marker by hand looks like.
		class HandMarked {
			public static readonly transactional = true;
		}

		expect(isTransactional(HandMarked)).toBe(true);
	});

	it("treats anything that is not strictly `true` as unmarked", () => {
		// biome-ignore lint/complexity/noStaticOnlyClass: same as above — a class carrying only the near-miss marker is exactly what is being probed.
		class Truthy {
			public static readonly transactional = "yes";
		}

		expect(isTransactional(Truthy)).toBe(false);
		expect(isTransactional(undefined)).toBe(false);
		expect(isTransactional({ transactional: true })).toBe(false);
	});
});
