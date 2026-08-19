import { describe, expect, it } from "bun:test";
import { StringVO } from "./collections/value-objects";
import {
	blueprint,
	defineDomainEvent,
	defineEventHandler,
	defineUseCase,
	entityOf,
	eventedRegistry,
} from "./index";
import type { IEventEmitter } from "./index";

const BeanPlanted = defineDomainEvent("bean.planted");

const beanProperties = blueprint({ name: StringVO }).done();

class Bean extends entityOf(beanProperties, "bean") {
	public plant(): void {
		this.raiseEvent(BeanPlanted);
	}
}

const plantBeanProperties = { name: StringVO };

class PlantBean extends defineUseCase<typeof plantBeanProperties, void, Bean>(
	plantBeanProperties,
	"plant-bean",
) {
	protected async handle(): Promise<Bean> {
		const bean = new Bean({ name: this.name });
		bean.plant();

		return bean;
	}
}

type ReactDeps = { readonly log: string[] };

const LogBeanPlanted = defineEventHandler<typeof BeanPlanted, ReactDeps>(
	async (event, deps) => {
		deps.log.push(event.name);
	},
);

class NoopEmitter implements IEventEmitter {
	public emit(): void {}
}

describe("@roastery/beans/way", () => {
	it("builds a whole feature — domain, event, use case, reaction, orchestration — from one import path", async () => {
		const log: string[] = [];
		const registry = eventedRegistry(
			{ plantBean: PlantBean },
			new NoopEmitter(),
		)
			.withDependencies({ log })
			.on(BeanPlanted, LogBeanPlanted);

		const { result, events } = await registry.get("plantBean")({
			name: "Arabica",
		});

		expect(result).toBeInstanceOf(Bean);
		expect(result.name).toBe("Arabica");
		expect(events.map((event) => event.name)).toEqual(["bean.planted"]);
		expect(log).toEqual(["bean.planted"]);
	});
});
