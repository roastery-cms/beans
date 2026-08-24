import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { EventClassOf } from "../types/event-class-of.type";

/**
 * Reads an event class's stable, dot-namespaced `name` without constructing
 * it: builds a probe with `Object.create(eventClass.prototype)` and calls
 * the `defineName` living on the prototype — the same pattern
 * `definitionOf`/`readDefinition` (`domain/entity/helpers/read-definition.ts`)
 * already use to read a blueprint off an `Entity` class. Only sound because
 * `defineName` is pure by `DomainEvent`'s own contract, and never touches
 * `aggregateId`.
 *
 * This is why `.on()` matches by `name`, never `instanceof`: an event
 * raised through `Entity.raiseEvent` is spread into a fresh plain object
 * before it is buffered, so it is never `instanceof` the class it was built
 * from — only `name` survives that spread intact.
 *
 * @param eventClass - The event class to inspect, e.g. `OrderConfirmed`.
 * @returns The class's `name`, as `defineName()` declares it.
 * @throws `InvalidEntityDefinitionException` — when `eventClass` does not
 *   declare `defineName` as a prototype method (not a `DomainEvent`
 *   subclass built the documented way).
 */
export function nameOf(eventClass: EventClassOf): string {
	// `defineName` is `protected` on `DomainEvent` — the same pragmatic cast
	// the lifecycle decorators already use to reach `raiseEvent` from outside
	// the class.
	const probe = Object.create(eventClass.prototype) as {
		defineName?: () => string;
	};

	if (typeof probe.defineName !== "function") {
		const className =
			(eventClass as { name?: string }).name ?? "anonymous class";

		throw new InvalidEntityDefinitionException(
			"commands",
			`commands: "${className}" does not declare defineName() as a prototype method — .on() can only target a DomainEvent subclass.`,
		);
	}

	return probe.defineName();
}
