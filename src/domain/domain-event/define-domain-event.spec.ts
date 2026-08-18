import { StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { defineDomainEvent } from "./define-domain-event";
import { DomainEvent } from "./domain-event";

describe("defineDomainEvent", () => {
	it("stamps name from the given name", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(new UserCreated("user-1").name).toBe("user.created");
	});

	it("stamps aggregateId with the value given to the constructor", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(new UserCreated("user-1").aggregateId).toBe("user-1");
	});

	it("stamps a fresh, ISO 8601 occurredAt", () => {
		const UserCreated = defineDomainEvent("user.created");
		const before = Date.now();

		const event = new UserCreated("user-1");
		const occurredAt = new Date(event.occurredAt).getTime();

		expect(occurredAt).toBeGreaterThanOrEqual(before);
		expect(occurredAt).toBeLessThanOrEqual(Date.now());
	});

	it("builds a DomainEvent instance", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(new UserCreated("user-1")).toBeInstanceOf(DomainEvent);
	});

	it("names the generated class after the given name", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(UserCreated.name).toBe("user.created");
	});

	it("produces unrelated classes across two calls with the same name", () => {
		const First = defineDomainEvent("user.created");
		const Second = defineDomainEvent("user.created");

		expect(new First("user-1")).not.toBeInstanceOf(Second);
	});
});

const userProperties = { name: StringVO };

const UserCreated = defineDomainEvent("user.created");

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface User extends AccessorsOf<typeof userProperties> {}
class User extends Entity<typeof userProperties> {
	protected defineEntity(): EntityDefinition<typeof userProperties> {
		return { properties: userProperties, source: "user" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(): void {
		this.raiseEvent(UserCreated);
	}
}

describe("defineDomainEvent used with Entity.raiseEvent", () => {
	it("accepts the generated class bare, without `new`", () => {
		const user = new User({ name: "Alan" });

		user.announce();

		expect(user.pullDomainEvents().map((event) => event.name)).toEqual([
			"user.created",
		]);
	});

	it("stamps the raising entity's own id as aggregateId", () => {
		const user = new User({ name: "Alan" });

		user.announce();

		const [event] = user.pullDomainEvents();

		expect(event?.aggregateId).toBe(user.id);
	});
});
