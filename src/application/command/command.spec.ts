import { blueprint } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { Entity } from "@/domain/entity";
import { SlugVO, StringVO } from "@/domain/collections/value-objects";
import { NullableStringVO } from "@/domain/collections/value-objects/nullable";
import { OptionalStringVO } from "@/domain/collections/value-objects/optional";
import { DomainEvent } from "@/domain/domain-event";
import {
	BadRequestException,
	UnprocessableContentException,
} from "@roastery/terroir/exceptions/application";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { Command } from "./command";
import { collectDomainEvents } from "./helpers";
import type {
	CommandAccessorsOf,
	CommandDefinition,
	CommandResult,
} from "./types";

/** Event with no payload of its own — used only to prove a Command can drain the events of an Entity it touched inside `execute()`. */
class BeanPlanted extends DomainEvent {
	protected defineName(): string {
		return "bean.planted";
	}
}

const beanProperties = { name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}

	public plant(): void {
		this.raiseEvent(BeanPlanted);
	}
}

const renameTagProperties = blueprint({ name: StringVO, slug: SlugVO }).with({
	slug: { derive: (raw) => raw.name },
});

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface RenameTagCommand
	extends CommandAccessorsOf<typeof renameTagProperties> {}
class RenameTagCommand extends Command<
	typeof renameTagProperties,
	void,
	string
> {
	protected defineCommand(): CommandDefinition<typeof renameTagProperties> {
		return { properties: renameTagProperties, source: "rename-tag" };
	}

	public async execute(): Promise<CommandResult<string>> {
		return { result: this.slug, events: [] };
	}
}

/** Optional key: may be missing from the body, and that is exactly what `fromJSON` has to accept. */
const searchProperties = { term: StringVO, page: OptionalStringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface SearchCommand extends CommandAccessorsOf<typeof searchProperties> {}
class SearchCommand extends Command<typeof searchProperties, void, string> {
	protected defineCommand(): CommandDefinition<typeof searchProperties> {
		return { properties: searchProperties, source: "search" };
	}

	public async execute(): Promise<CommandResult<string>> {
		return { result: this.term, events: [] };
	}
}

/** Nullable key: must be present, even if only as `null` — the contrast with the one above. */
const archiveProperties = { reason: NullableStringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface ArchiveCommand extends CommandAccessorsOf<typeof archiveProperties> {}
class ArchiveCommand extends Command<typeof archiveProperties, void, null> {
	protected defineCommand(): CommandDefinition<typeof archiveProperties> {
		return { properties: archiveProperties, source: "archive" };
	}

	public async execute(): Promise<CommandResult<null>> {
		return { result: null, events: [] };
	}
}

const plantBeanProperties = { name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface PlantBeanCommand
	extends CommandAccessorsOf<typeof plantBeanProperties> {}
class PlantBeanCommand extends Command<typeof plantBeanProperties, void, Bean> {
	protected defineCommand(): CommandDefinition<typeof plantBeanProperties> {
		return { properties: plantBeanProperties, source: "plant-bean" };
	}

	public async execute(): Promise<CommandResult<Bean>> {
		const bean = new Bean({ name: this.name });
		bean.plant();

		return { result: bean, events: collectDomainEvents(bean) };
	}
}

describe("Command", () => {
	describe("defineCommand", () => {
		it("supplies the blueprint without the subclass declaring a constructor", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect(command).toBeInstanceOf(RenameTagCommand);
			expect(command.name).toBe("hello");
		});

		it("rejects an implementation declared as a class field", () => {
			class Broken extends Command<typeof plantBeanProperties, void, Bean> {
				protected defineCommand = (): CommandDefinition<
					typeof plantBeanProperties
				> => ({
					properties: plantBeanProperties,
					source: "broken",
				});

				public async execute(): Promise<CommandResult<Bean>> {
					return { result: new Bean({ name: this.get("name") }), events: [] };
				}
			}

			expect(() => Broken.demo()).toThrow(InvalidEntityDefinitionException);
		});
	});

	describe("construction", () => {
		it("exposes the raw values it was built from via typed accessors", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect(command.name).toBe("hello");
		});

		it("has no identity — no id, createdAt or updatedAt", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect((command as unknown as { id?: unknown }).id).toBeUndefined();
			expect(
				(command as unknown as { createdAt?: unknown }).createdAt,
			).toBeUndefined();
		});

		it("does not expose set/setMany — a Command is immutable once built", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect((command as unknown as { set?: unknown }).set).toBeUndefined();
			expect(
				(command as unknown as { setMany?: unknown }).setMany,
			).toBeUndefined();
		});

		it("refuses a blueprint key that collides with an existing member", () => {
			const collidingProperties = { schema: StringVO };

			class Colliding extends Command<
				typeof collidingProperties,
				void,
				string
			> {
				protected defineCommand(): CommandDefinition<
					typeof collidingProperties
				> {
					return { properties: collidingProperties, source: "colliding" };
				}

				public async execute(): Promise<CommandResult<string>> {
					return { result: "", events: [] };
				}
			}

			try {
				new Colliding({ schema: "boom" });
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(PropertyNameCollisionException);
				expect((error as PropertyNameCollisionException).property).toBe(
					"schema",
				);
				expect((error as PropertyNameCollisionException).source).toBe(
					"colliding",
				);
			}

			// The install is atomic: a rejected attempt must not mark the
			// prototype as already installed and let the next one slip through unnoticed.
			expect(() => new Colliding({ schema: "boom" })).toThrow(
				PropertyNameCollisionException,
			);
		});

		it("wraps a property validation failure as an application-layer exception, not a domain one", () => {
			try {
				new RenameTagCommand({ name: "hello", slug: "" });
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(UnprocessableContentException);
				expect((error as UnprocessableContentException).source).toBe(
					"rename-tag",
				);
				// The original cause — the domain-layer InvalidPropertyException the
				// ValueObject threw — stays preserved in `cause`, not hidden.
				expect((error as UnprocessableContentException).cause).toBeInstanceOf(
					InvalidPropertyException,
				);
			}
		});
	});

	describe("rules", () => {
		it("derives a ruled property from its siblings", () => {
			const command = new RenameTagCommand({ name: "Hello World" });

			expect(command.slug).toBe("hello-world");
		});

		it("applies rules in demo() too, keeping the fixture coherent", () => {
			const command = RenameTagCommand.demo();

			expect(command.name).toBe("string");
			expect(command.slug).toBe("string");
		});
	});

	describe("demo", () => {
		it("builds via the concrete subclass, not the abstract base", () => {
			const command = RenameTagCommand.demo();

			expect(command).toBeInstanceOf(RenameTagCommand);
		});
	});

	describe("fromJSON", () => {
		it("hydrates a full, valid payload", () => {
			const command = RenameTagCommand.fromJSON({
				name: "hello",
				slug: "hello",
			});

			expect(command.name).toBe("hello");
			expect(command.slug).toBe("hello");
		});

		it("rejects a payload missing a key — rules do not relax fromJSON — as an application-layer exception", () => {
			expect(() =>
				RenameTagCommand.fromJSON({ name: "hello" } as never),
			).toThrow(BadRequestException);
		});

		it("rejects a payload with an extra key", () => {
			expect(() =>
				RenameTagCommand.fromJSON({
					name: "hello",
					slug: "hello",
					extra: "boom",
				} as never),
			).toThrow(BadRequestException);
		});

		it("accepts a body that simply omitted an optional key", () => {
			// The case that motivates the fix: `fromJSON` is the entry point for an
			// HTTP body, and `JSON.stringify` drops any key whose value is `undefined`.
			// Without `t.Optional` in `modelFor`, a client that omitted an optional
			// field would get a 400.
			const command = SearchCommand.fromJSON({ term: "café" });

			expect(command.term).toBe("café");
			expect(command.page).toBeUndefined();
		});

		it("accepts the same body with the optional key filled in", () => {
			expect(SearchCommand.fromJSON({ term: "café", page: "2" }).page).toBe(
				"2",
			);
		});

		it("keeps a nullable key required — null is not undefined", () => {
			expect(() =>
				SearchCommand.fromJSON({ term: "café" } as never),
			).not.toThrow();
			expect(() => ArchiveCommand.fromJSON({} as never)).toThrow(
				BadRequestException,
			);
			expect(() => ArchiveCommand.fromJSON({ reason: null })).not.toThrow();
		});
	});

	describe("get", () => {
		it("rejects an unknown key", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect(() => command.get("unknown" as never)).toThrow(
				InvalidPropertyException,
			);
		});
	});

	describe("schema", () => {
		it("derives an object schema from the blueprint, with no identity fields", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect(Object.keys(command.schema.properties).sort()).toEqual([
				"name",
				"slug",
			]);
			expect(command.schema.additionalProperties).toBe(false);
		});

		it("shares one schema object across instances of the same class", () => {
			expect(new RenameTagCommand({ name: "a" }).schema).toBe(
				new RenameTagCommand({ name: "b" }).schema,
			);
		});
	});

	describe("toJSON", () => {
		it("serializes every blueprint property to its raw value", () => {
			const command = new RenameTagCommand({ name: "hello" });

			expect(command.toJSON()).toEqual({ name: "hello", slug: "hello" });
		});
	});

	describe("execute", () => {
		it("resolves to a CommandResult carrying the result and an empty events array by default", async () => {
			const command = new RenameTagCommand({ name: "hello" });

			const { result, events } = await command.execute();

			expect(result).toBe("hello");
			expect(events).toEqual([]);
		});

		it("surfaces domain events raised by an Entity touched during execute(), via collectDomainEvents", async () => {
			const command = new PlantBeanCommand({ name: "arabica" });

			const { result, events } = await command.execute();

			expect(result).toBeInstanceOf(Bean);
			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				name: "bean.planted",
				aggregateId: result.id,
			});

			// pullDomainEvents was already drained inside execute(); nothing is left on the bean.
			expect(result.pullDomainEvents()).toEqual([]);
		});
	});
});
