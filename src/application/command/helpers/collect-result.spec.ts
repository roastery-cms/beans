import { StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { collectResult } from "./collect-result";

const childProperties = { label: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Child extends AccessorsOf<typeof childProperties> {}
class Child extends Entity<typeof childProperties> {
	protected defineEntity(): EntityDefinition<typeof childProperties> {
		return { properties: childProperties, source: "child" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(name: string): void {
		this.raiseEvent({ name });
	}
}

const parentProperties = { title: StringVO, child: Child };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Parent extends AccessorsOf<typeof parentProperties> {}
class Parent extends Entity<typeof parentProperties> {
	protected defineEntity(): EntityDefinition<typeof parentProperties> {
		return { properties: parentProperties, source: "parent" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(name: string): void {
		this.raiseEvent({ name });
	}
}

describe("collectResult", () => {
	it("returns the entity as result and an empty events array when nothing was raised", () => {
		const parent = new Parent({ title: "t", child: { label: "l" } });

		expect(collectResult(parent)).toEqual({ result: parent, events: [] });
	});

	it("collects events raised by the result entity and drains its buffer", () => {
		const parent = new Parent({ title: "t", child: { label: "l" } });
		parent.announce("parent.touched");

		const { result, events } = collectResult(parent);

		expect(result).toBe(parent);
		expect(events.map((event) => event.name)).toEqual(["parent.touched"]);
		expect(parent.pullDomainEvents()).toEqual([]);
	});

	it("pulls deep, so a nested entity's events are included too", () => {
		const parent = new Parent({ title: "t", child: { label: "l" } });
		parent.get("child").announce("child.touched");

		const { events } = collectResult(parent);

		expect(events.map((event) => event.name)).toEqual(["child.touched"]);
	});

	it("appends extra aggregates' events after the result's own, in call order", () => {
		const parent = new Parent({ title: "t", child: { label: "l" } });
		parent.announce("parent.touched");

		const sibling = new Parent({ title: "s", child: { label: "l" } });
		sibling.announce("sibling.touched");

		const { events } = collectResult(parent, sibling);

		expect(events.map((event) => event.name)).toEqual([
			"parent.touched",
			"sibling.touched",
		]);
	});
});
