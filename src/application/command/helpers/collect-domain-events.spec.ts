import { StringVO } from "@/domain/collections/value-objects";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { collectDomainEvents } from "./collect-domain-events";

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
}

describe("collectDomainEvents", () => {
	it("returns an empty array when nothing is passed", () => {
		expect(collectDomainEvents()).toEqual([]);
	});

	it("drains every aggregate passed and concatenates in call order", () => {
		const eventA = { name: "a", occurredAt: "t", aggregateId: "1" };
		const eventB = { name: "b", occurredAt: "t", aggregateId: "2" };

		let pulledA = false;
		let pulledB = false;

		const aggregateA = {
			pullDomainEvents: () => {
				pulledA = true;
				return [eventA];
			},
		};
		const aggregateB = {
			pullDomainEvents: () => {
				pulledB = true;
				return [eventB];
			},
		};

		expect(collectDomainEvents(aggregateA, aggregateB)).toEqual([
			eventA,
			eventB,
		]);
		expect(pulledA).toBe(true);
		expect(pulledB).toBe(true);
	});

	it("skips an aggregate with an empty buffer without breaking the order of the rest", () => {
		const eventA = { name: "a", occurredAt: "t", aggregateId: "1" };
		const empty = { pullDomainEvents: () => [] };
		const withEvent = { pullDomainEvents: () => [eventA] };

		expect(collectDomainEvents(empty, withEvent)).toEqual([eventA]);
	});

	it("pulls deep, so a nested entity's events are not stranded", () => {
		const parent = new Parent({ title: "t", child: { label: "l" } });

		parent.get("child").announce("child.touched");

		expect(collectDomainEvents(parent).map((event) => event.name)).toEqual([
			"child.touched",
		]);
	});

	it("still accepts an aggregate whose pullDomainEvents takes no argument", () => {
		// The structural type declares the parameter as optional, so a
		// zero-parameter implementation still satisfies the contract and
		// simply ignores the option.
		const event = { name: "a", occurredAt: "t", aggregateId: "1" };
		const shallowOnly = { pullDomainEvents: (): IDomainEvent[] => [event] };

		expect(collectDomainEvents(shallowOnly)).toEqual([event]);
	});
});
