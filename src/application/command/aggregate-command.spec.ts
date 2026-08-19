import { StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { AggregateCommand } from "./aggregate-command";
import type { CommandAccessorsOf, CommandDefinition } from "./types";

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

const createParentProperties = { title: StringVO };

type CreateParentDeps = { childLabel: string };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface CreateParentCommand
	extends CommandAccessorsOf<typeof createParentProperties> {}
class CreateParentCommand extends AggregateCommand<
	typeof createParentProperties,
	CreateParentDeps,
	Parent
> {
	protected defineCommand(): CommandDefinition<typeof createParentProperties> {
		return { properties: createParentProperties, source: "create-parent" };
	}

	protected async handle({ childLabel }: CreateParentDeps): Promise<Parent> {
		const parent = new Parent({
			title: this.title,
			child: { label: childLabel },
		});
		parent.announce("parent.created");

		return parent;
	}
}

/** `Deps = void`: `handle` declares no parameter, same idiom `Command` subclasses already use for `execute`. */
const touchChildProperties = { label: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface TouchChildCommand
	extends CommandAccessorsOf<typeof touchChildProperties> {}
class TouchChildCommand extends AggregateCommand<
	typeof touchChildProperties,
	void,
	Child
> {
	protected defineCommand(): CommandDefinition<typeof touchChildProperties> {
		return { properties: touchChildProperties, source: "touch-child" };
	}

	protected async handle(): Promise<Child> {
		const child = new Child({ label: this.label });
		child.announce("child.touched");

		return child;
	}
}

describe("AggregateCommand", () => {
	describe("execute", () => {
		it("is inherited — the subclass implements handle() instead", async () => {
			const command = new CreateParentCommand({ title: "t" });

			const { result, events } = await command.execute({
				childLabel: "l",
			});

			expect(result).toBeInstanceOf(Parent);
			expect(result.title).toBe("t");
			expect(events.map((event) => event.name)).toEqual(["parent.created"]);
		});

		it("drains deep, so a nested entity's events raised inside handle() are not stranded", async () => {
			class CreateParentAndTouchChildCommand extends AggregateCommand<
				typeof createParentProperties,
				CreateParentDeps,
				Parent
			> {
				protected defineCommand(): CommandDefinition<
					typeof createParentProperties
				> {
					return {
						properties: createParentProperties,
						source: "create-parent-and-touch-child",
					};
				}

				protected async handle({
					childLabel,
				}: CreateParentDeps): Promise<Parent> {
					const parent = new Parent({
						title: this.get("title"),
						child: { label: childLabel },
					});
					parent.get("child").announce("child.touched");

					return parent;
				}
			}

			const command = new CreateParentAndTouchChildCommand({ title: "t" });
			const { events } = await command.execute({ childLabel: "l" });

			expect(events.map((event) => event.name)).toEqual(["child.touched"]);
		});

		it("works with Deps = void, calling handle() with an argument it ignores", async () => {
			const command = new TouchChildCommand({ label: "l" });

			const { result, events } = await command.execute();

			expect(result).toBeInstanceOf(Child);
			expect(events.map((event) => event.name)).toEqual(["child.touched"]);
		});

		it("returns an empty events array when handle()'s aggregate raised nothing", async () => {
			class SilentCommand extends AggregateCommand<
				typeof touchChildProperties,
				void,
				Child
			> {
				protected defineCommand(): CommandDefinition<
					typeof touchChildProperties
				> {
					return { properties: touchChildProperties, source: "silent" };
				}

				protected async handle(): Promise<Child> {
					return new Child({ label: this.get("label") });
				}
			}

			const { events } = await new SilentCommand({ label: "l" }).execute();

			expect(events).toEqual([]);
		});
	});

	describe("demo/fromJSON", () => {
		it("demo() still builds the concrete subclass through the new base", () => {
			expect(TouchChildCommand.demo()).toBeInstanceOf(TouchChildCommand);
		});

		it("fromJSON() still hydrates strictly through the new base", () => {
			const command = TouchChildCommand.fromJSON({ label: "l" });

			expect(command).toBeInstanceOf(TouchChildCommand);
			expect(command.label).toBe("l");
		});
	});
});
