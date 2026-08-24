import type { DomainEvent } from "@/domain/domain-event";
import type { IEventHandler } from "./ievent-handler.interface";

/**
 * The **class** {@link defineEventHandler} returns — not an instance.
 *
 * The class is declared *inside* the factory body, so without a named
 * public type the declaration build fails with TS4060 (`Return type of
 * exported function has or is using private name`). The package emits
 * declarations (`tsconfig.build.json` sets `declaration: true` and
 * `bun run build` runs `tsup --dts`), so an inferred return type would
 * simply not compile.
 *
 * Unlike `DomainEventClassOf` (`@roastery/beans/domain/domain-event/types`)
 * — `DomainEvent` itself takes no type parameters — `IEventHandler<Event,
 * Deps>` is generic over both the event it reacts to and the dependencies
 * its `handle()` needs, so this alias carries both slots forward, the same
 * way `ValueObjectClassOf`
 * (`@roastery/beans/domain/collections/value-objects/custom/types`) carries
 * `ValueType`/`SchemaType` forward for `defineValueObject`.
 *
 * Structurally identical to `AnyEventHandlerClass` (`./any-event-handler-class.type`)
 * at that type's own widest bound (`never` in both `handle` slots) — a
 * zero-argument constructor whose instances resolve `handle` to
 * `Promise<void>` — which is what lets a class shaped like this be passed
 * straight to `IEventedCommands.on()`, gated the same way a hand-written
 * `implements IEventHandler<Event, Deps>` class already is.
 *
 * @typeParam Event - The concrete event type the generated handler reacts to.
 * @typeParam Deps - The dependencies the generated handler's `handle()` needs.
 *
 * @see `defineEventHandler` — the factory returning this shape.
 * @see {@link IEventHandler} — the contract every generated class implements.
 */
export type EventHandlerClassOf<Event extends DomainEvent, Deps> = {
	/** Instance side — every generated class implements `IEventHandler<Event, Deps>`. */
	readonly prototype: IEventHandler<Event, Deps>;

	/**
	 * Zero-argument, mirroring `AnyEventHandlerClass` — `commands`
	 * constructs a fresh instance (`new HandlerClass()`) per matching event.
	 */
	new (): IEventHandler<Event, Deps>;
};
