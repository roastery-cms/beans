import { StringVO, UuidVO } from "@/domain/collections/value-objects";
import { DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import { PropertyNameCollisionException } from "@roastery/terroir/exceptions/domain";
import { Storage } from "@roastery/terroir/symbols";
import { describe, expect, it } from "bun:test";
import { blueprint, entityOf } from "@/domain/entity/helpers";

class AuthorRenamed extends DomainEvent {
	protected defineName(): string {
		return "author.renamed";
	}
}

const authorProperties = blueprint({ name: StringVO, slug: StringVO }).with({
	slug: { derive: (raw) => raw.name },
});

class Author extends entityOf(authorProperties, "author") {
	public rename(value: string): void {
		this.set("name", value);
		this.raiseEvent(AuthorRenamed);
	}

	public cache(value: string): void {
		this[Storage].set("cached", value);
	}

	public cached(): string | null {
		return this[Storage].get("cached");
	}
}

const author = (): Author => new Author({ name: "Alan Reis" });

describe("entityOf", () => {
	it("types the blueprint accessors with no interface merge", () => {
		// The line the class pattern would require — `interface Author extends
		// AccessorsOf<…> {}` — does not exist in this file. The typing below is the test.
		const name: string = author().name;
		const slug: string = author().slug;

		expect(name).toBe("Alan Reis");
		expect(slug).toBe("Alan Reis");
	});

	it("supplies the identity the base always supplies", () => {
		const one = author();

		expect(one.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(one.createdAt).toBeString();
		expect(one.updatedAt).toBeUndefined();
	});

	it("produces real Entity instances", () => {
		expect(author()).toBeInstanceOf(Entity);
		expect(author()).toBeInstanceOf(Author);
	});

	it("keeps protected members reachable from the subclass", () => {
		const one = author();

		one.cache("hit");
		expect(one.cached()).toBe("hit");

		one.rename("Alan R.");
		expect(one.pullDomainEvents().map((event) => event.name)).toEqual([
			"author.renamed",
		]);
	});

	it("resolves blueprint rules exactly as the class form does", () => {
		expect(author().slug).toBe("Alan Reis");
		expect(new Author({ name: "X", slug: "given" }).slug).toBe("given");
	});

	it("returns the subclass from demo(), not the base", () => {
		const fixture = Author.demo();

		expect(fixture).toBeInstanceOf(Author);
		expect(fixture.name).toBe("string");
	});

	it("returns the subclass from fromJSON(), preserving identity", () => {
		const original = author();
		const hydrated = Author.fromJSON(original.toJSON());

		expect(hydrated).toBeInstanceOf(Author);
		expect(hydrated.id).toBe(original.id);
	});

	it("mutates and serializes like any other entity", () => {
		const one = author();

		expect(one.set("name", "Alan R.")).toBe(true);
		expect(one.updatedAt).toBeString();
		expect(one.toJSON().name).toBe("Alan R.");
	});

	it("still guards against a blueprint key colliding with a base member", () => {
		const bad = { schema: StringVO };

		expect(() => new (entityOf(bad, "bad"))({ schema: "x" })).toThrow(
			PropertyNameCollisionException,
		);
	});

	it("carries the definition's extra options through", () => {
		const Secretive = entityOf({ token: UuidVO }, "secretive", {
			sensitive: ["token"],
		});
		const one = new Secretive({
			token: "01a012c3-494a-72ce-9c70-6f04736f39b7",
		});

		expect(one.toSafeJSON().token).toBe("[redacted]");
		expect(one.toJSON().token).toBe("01a012c3-494a-72ce-9c70-6f04736f39b7");
	});
});
