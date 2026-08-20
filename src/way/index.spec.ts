import { describe, expect, it } from "bun:test";
import { StringVO } from "./collections/value-objects";
import {
	blueprint,
	commandRegistry,
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

	/**
	 * The events-free entry point, and the reason it is in this barrel at all:
	 * `eventedRegistry` requires an `IEventEmitter`, which means deciding where
	 * events go before there is anything to publish. `commandRegistry` asks for
	 * none of that, and still hands back the very same `CommandResult` — its
	 * `events` included — so nothing is given up by starting here.
	 */
	it("orchestrates a use case without an emitter, or any knowledge of events", async () => {
		const registry = commandRegistry({
			plantBean: PlantBean,
		}).withDependencies({});

		const { result, events } = await registry.get("plantBean")({
			name: "Robusta",
		});

		expect(result).toBeInstanceOf(Bean);
		expect(result.name).toBe("Robusta");
		// The events are still surfaced — publishing them is what is opt-in,
		// not raising or collecting them.
		expect(events.map((event) => event.name)).toEqual(["bean.planted"]);
	});

	it("takes the same spec as eventedRegistry, so moving up is a change of registry only", async () => {
		const spec = { plantBean: PlantBean };

		const plain = await commandRegistry(spec)
			.withDependencies({})
			.get("plantBean")({ name: "Liberica" });

		const evented = await eventedRegistry(spec, new NoopEmitter())
			.withDependencies({ log: [] })
			.get("plantBean")({ name: "Liberica" });

		expect(plain.result.name).toBe(evented.result.name);
		expect(plain.events.map((event) => event.name)).toEqual(
			evented.events.map((event) => event.name),
		);
	});
});
