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
