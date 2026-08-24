/**
 * Widest `IEventHandler` **class** type: something whose instances resolve
 * `handle()` to `Promise<void>` and whose constructor takes nothing.
 *
 * `never` in both slots of `handle` is the same "widest possible
 * contravariant bound" idiom `AnyCommandClass`/`AnyValueObjectClass` already
 * use — it makes every real `IEventHandler` implementation, regardless of
 * its actual `Event`/`Deps`, satisfy this bound, while the real types are
 * recovered afterwards from the concrete class via `EventHandlerEventOfClass`/
 * `EventHandlerDepsOfClass`.
 *
 * @see `IEventHandler` in `./ievent-handler.interface` — the contract a
 *   concrete handler class implements.
 */
export type AnyEventHandlerClass = {
	readonly prototype: {
		handle(event: never, deps: never): Promise<void>;
	};
	new (): {
		handle(event: never, deps: never): Promise<void>;
	};
};
