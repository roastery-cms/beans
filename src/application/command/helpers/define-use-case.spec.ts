import { commandRegistry } from "@/application/command-registry";
import type { WithSiblingCommands } from "@/application/command/types";
import { StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { defineUseCase } from "./define-use-case";

const beanProperties = { name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}
}

const plantBeanProperties = { name: StringVO };

class PlantBean extends defineUseCase<typeof plantBeanProperties, void, Bean>(
	plantBeanProperties,
	"plant-bean",
) {
	protected async handle(): Promise<Bean> {
		return new Bean({ name: this.name });
	}
}

describe("defineUseCase", () => {
	it("behaves exactly like aggregateCommandOf: typed accessors, no interface merge", () => {
		const command = new PlantBean({ name: "Arabica" });

		expect(command.name).toBe("Arabica");
	});

	it("execute() (inherited) wraps handle()'s aggregate into a CommandResult", async () => {
		const { result, events } = await new PlantBean({
			name: "Arabica",
		}).execute();

		expect(result).toBeInstanceOf(Bean);
		expect(result.name).toBe("Arabica");
		expect(events).toEqual([]);
	});

	it("returns the subclass from demo()/fromJSON(), same as aggregateCommandOf", () => {
		expect(PlantBean.demo()).toBeInstanceOf(PlantBean);
		expect(PlantBean.fromJSON({ name: "Arabica" })).toBeInstanceOf(PlantBean);
	});
});

/**
 * The `Siblings` type argument: the runtime has always injected a `commands`
 * bag (`commandRegistry`'s `buildCommands`), but until it existed the only
 * way to *see* that bag was to write `commands: { roast: CommandRunner<…> }`
 * into `Deps` by hand. Here the sibling **class** is named instead and the
 * runner is derived, including its payload and result types.
 */
const roastBeanProperties = { name: StringVO };

class RoastBean extends defineUseCase<
	typeof roastBeanProperties,
	{ readonly log: string[] },
	Bean
>(roastBeanProperties, "roast-bean") {
	protected async handle({ log }: { readonly log: string[] }): Promise<Bean> {
		log.push(`roasted ${this.name}`);

		return new Bean({ name: this.name });
	}
}

type HarvestDeps = { readonly log: string[] };
type HarvestSiblings = { roastBean: typeof RoastBean };

class HarvestBean extends defineUseCase<
	typeof roastBeanProperties,
	HarvestDeps,
	Bean,
	HarvestSiblings
>(roastBeanProperties, "harvest-bean") {
	protected async handle(
		deps: WithSiblingCommands<HarvestDeps, HarvestSiblings>,
	): Promise<Bean> {
		// `commands.roastBean` is typed straight off the class: the payload it
		// takes and the `CommandResult<Bean>` it resolves to both come from
		// `RoastBean` itself, with nothing declared in `CommandRunner<…>` terms.
		const { result } = await deps.commands.roastBean({ name: this.name });

		deps.log.push(`harvested ${result.name}`);

		return result;
	}
}

describe("defineUseCase — Siblings", () => {
	it("derives a typed commands bag from the sibling classes it names", async () => {
		const log: string[] = [];
		const registry = commandRegistry({
			harvestBean: HarvestBean,
			roastBean: RoastBean,
		}).withDependencies({ log });

		const { result } = await registry.get("harvestBean")({ name: "Arabica" });

		expect(result).toBeInstanceOf(Bean);
		expect(log).toEqual(["roasted Arabica", "harvested Arabica"]);
	});

	it("leaves Deps untouched when Siblings is omitted", () => {
		// The `[keyof Siblings] extends [never]` guard: with the default, the
		// resolved deps type is `Deps` *itself*, not `Deps & { commands: {} }` —
		// which is what keeps `DepsOfClass`'s `void`/`unknown` branches working
		// for every command that never names a sibling.
		type PlantDeps = Parameters<PlantBean["execute"]>[0];
		type Assert<T extends true> = T;

		type _NoCommandsKey = Assert<
			"commands" extends keyof PlantDeps ? false : true
		>;

		expect(new PlantBean({ name: "Arabica" })).toBeInstanceOf(PlantBean);
	});
});
