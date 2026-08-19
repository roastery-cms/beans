import { StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { BadRequestException } from "@roastery/terroir/exceptions/application";
import { describe, expect, it } from "bun:test";
import { aggregateCommandOf } from "./aggregate-command-of";

const beanProperties = { name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public plant(): void {
		this.raiseEvent({ name: "bean.planted" });
	}
}

type Deps = { readonly variety: string };

const plantBeanProperties = { name: StringVO };

class PlantBean extends aggregateCommandOf<
	typeof plantBeanProperties,
	Deps,
	Bean
>(plantBeanProperties, "plant-bean") {
	protected async handle({ variety }: Deps): Promise<Bean> {
		// Typed accessor, no interface merge — that's the test.
		const bean = new Bean({ name: `${this.name} (${variety})` });
		bean.plant();

		return bean;
	}
}

const plantBean = (): PlantBean => new PlantBean({ name: "Arabica" });

describe("aggregateCommandOf", () => {
	it("types the blueprint accessors with no interface merge", () => {
		const name: string = plantBean().name;

		expect(name).toBe("Arabica");
	});

	it("runs execute (inherited from AggregateCommand) with the accessors in scope inside handle()", async () => {
		const { result } = await plantBean().execute({ variety: "Bourbon" });

		expect(result).toBeInstanceOf(Bean);
		expect(result.name).toBe("Arabica (Bourbon)");
	});

	it("collects the events handle()'s aggregate raised, via collectResult", async () => {
		const { events } = await plantBean().execute({ variety: "Bourbon" });

		expect(events.map((event) => event.name)).toEqual(["bean.planted"]);
	});

	it("returns the subclass from demo(), not the base", () => {
		const fixture = PlantBean.demo();

		expect(fixture).toBeInstanceOf(PlantBean);
		expect(fixture.name).toBe("string");
	});

	it("hydrates strictly through fromJSON", () => {
		const hydrated = PlantBean.fromJSON({ name: "Arabica" });

		expect(hydrated).toBeInstanceOf(PlantBean);
		expect(hydrated.name).toBe("Arabica");
	});

	it("rejects an extra key through fromJSON, like the class form", () => {
		expect(() =>
			PlantBean.fromJSON({
				extra: "nope",
				name: "Arabica",
			} as unknown as ReturnType<PlantBean["toJSON"]>),
		).toThrow(BadRequestException);
	});
});
