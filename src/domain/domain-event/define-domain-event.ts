import { DomainEvent } from "./domain-event";
import type { DomainEventClassOf } from "./types";

/**
 * Builds a payload-less `DomainEvent` **class** from just its name — the
 * practical shortcut for the common case where an event carries nothing
 * beyond the `{ name, occurredAt, aggregateId }` every event already gets
 * from the base, without writing a whole subclass for it.
 *
 * The generated class's constructor is exactly `(aggregateId: string)`, the
 * same shape `Entity.raiseEvent` already accepts **bare, without `new`**
 * (`this.raiseEvent(UserCreated)`) — so this is a drop-in replacement for
 * that one-`defineName()`-method subclass, nothing more. An event with
 * payload fields of its own still needs a hand-written subclass: a
 * constructor with extra required parameters is not something a function
 * shaped `(name: string) => Class` can produce.
 *
 * **Call this at module scope, once** — the same rule the custom
 * value-object factories (`@roastery/beans/domain/collections/value-objects/custom`)
 * already document. Each call mints a fresh class, so two calls with the
 * same name produce unrelated classes and `instanceof` does not relate them.
 *
 * @param name - The event's stable, dot-namespaced name (e.g. `"user.created"`).
 * @returns The generated `DomainEvent` subclass, ready for `raiseEvent` — as
 *   the bare class itself, or `new`-ed directly.
 *
 * @see {@link DomainEventClassOf} — the returned shape.
 * @see {@link DomainEvent} — the base class every generated event extends.
 *
 * @example
 * ```ts
 * const UserCreated = defineDomainEvent("user.created");
 *
 * // inside User (from @roastery/beans/domain/entity):
 * @onCreate(UserCreated)
 * class User extends Entity<typeof userProperties> { ... }
 *
 * // or raised by hand, still without `new`:
 * this.raiseEvent(UserCreated);
 * ```
 */
export function defineDomainEvent(name: string): DomainEventClassOf {
	class GeneratedDomainEvent extends DomainEvent {
		protected defineName(): string {
			return name;
		}
	}

	Object.defineProperty(GeneratedDomainEvent, "name", {
		configurable: true,
		value: name,
	});

	// The cast covers the same gap `defineValueObject` covers with its own
	// cast: TypeScript can't prove on its own that the class declared above
	// satisfies the public alias, only that it satisfies `DomainEvent`.
	return GeneratedDomainEvent as DomainEventClassOf;
}
