import { renameDecorated } from "./helpers/rename-decorated";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityMethodDecorator } from "./types/entity-method-decorator.type";

/**
 * Method decorator: raises `event` once the decorated `Entity` method has
 * run to completion. Unlike the lifecycle decorators (`onCreate`,
 * `onUpdate`, `onDelete`), which each wrap one fixed point of an entity's
 * lifecycle, `emit` wraps an **arbitrary instance method** — any business
 * operation, not a fixed lifecycle point.
 *
 * **The event is a consequence of the method having succeeded.** If the
 * method throws, no event is raised: there is no `try`/`catch` here, so the
 * `raiseEvent` call written after `target.apply(this, args)` simply never
 * executes and the exception propagates untouched. That falls out of
 * ordinary control flow rather than being handled for — the scenario "the
 * event fires despite the throw" is one this code structurally cannot
 * produce. Reach for `onError` when the *failure* is the fact worth
 * recording.
 *
 * **It does not await a `Promise`.** If the decorated method is `async` (or
 * otherwise returns a `Promise`), the event is raised as soon as the
 * synchronous call returns — once the pending `Promise` itself comes back,
 * not once it settles. No `Entity` method in this package is `async` today,
 * so this is a documented restriction rather than an observed gap.
 *
 * **This `emit` does not publish.** `emit` also names the one member of
 * `IEventEmitter` (`@roastery/beans/application/commands`), where it
 * means "publish onto the bus". This decorator does no such thing: it raises
 * into the entity's own `[Events]` buffer, which only ever leaves through
 * `pullDomainEvents`. Whether those events reach a bus is `commands`'s
 * decision, one layer up. Same word, different layer, different contract —
 * and no ambiguity in the module graph, since each lives behind its own
 * subpath.
 *
 * Instance methods only: decorating a `static` method compiles (nothing in
 * the type constrains the receiver to an instance) but fails at runtime on
 * the `raiseEvent` cast, since a static method's `this` is the class
 * constructor, which has no `raiseEvent`. Not guarded at runtime, the same
 * way the lifecycle decorators don't defend against out-of-contract use
 * either.
 *
 * The replacement must be written as the direct initializer of
 * `const replacement: typeof target = function (...) {...}` — that is what
 * gives the implicit `this` parameter and the rest parameter `args` their
 * contextual typing, inherited from `typeof target`'s own `This`/`Args`/
 * `Return`. A `function replacement(...) {}` declared separately and
 * returned afterwards would **not** get contextual typing — that only
 * applies at a syntactic position that already expects a type (an
 * assignment or return expression), not a later reference to an
 * already-declared, unannotated function — and would fall back to implicit
 * `any` under this package's `strict: true`.
 *
 * A signature such as `function (this: unknown, ...args: unknown[]): unknown`
 * does not type-check here either: return-position assignability is
 * covariant, and `unknown` is not assignable to an arbitrary generic
 * `Return` — only to a `Return` that happens to be `unknown` itself. Keeping
 * the replacement's type as exactly `typeof target` is what lets a decorated
 * method keep its original parameter and return types in the decorated
 * class, rather than widening them.
 *
 * `target.apply(this, args)`, not a bare `target(...args)` call — `target`
 * is a detached function value with no receiver of its own, and a direct
 * call would run with `this === undefined` in strict mode, breaking any
 * `this.get(...)`/`this.set(...)` the wrapped method's body makes.
 *
 * Because `replacement` is typed literally as `typeof target` (not a
 * structurally different mixin subclass, unlike the class decorators'
 * `class Decorated extends target`), {@link renameDecorated} needs no
 * `as unknown as typeof target` cast on the way out — `Wrapper` already
 * infers as exactly `typeof target`.
 *
 * @param event - A payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`) — the same bare-class form
 *   `Entity.raiseEvent` already accepts without `new`. Only this form is
 *   accepted; a decorator is declared once, at the method, with no per-call
 *   payload to build a concrete instance from. `onError` is the one
 *   exception, since its error genuinely is call-time data.
 * @returns A method decorator.
 *
 * @example
 * ```ts
 * class Order extends Entity<typeof orderProperties> {
 *   protected defineEntity(): EntityDefinition<typeof orderProperties> {
 *     return { properties: orderProperties, source: "order" };
 *   }
 *
 *   @emit(OrderShipped)
 *   public ship(): void {
 *     // business logic
 *   }
 * }
 *
 * order.ship();               // runs the method body, then raises OrderShipped
 * order.pullDomainEvents();   // [{ name: "order.shipped", ... }]
 * ```
 *
 * @see `onError` in `@roastery/beans/domain/entity/decorators` — the
 *   counterpart for the failure path. Stacked together, a throw raises
 *   `onError`'s event and never `emit`'s; a clean run raises `emit`'s and
 *   never `onError`'s.
 */
export function emit(event: BareDomainEventClass): EntityMethodDecorator {
	return (target, context) => {
		const replacement: typeof target = function (...args) {
			const result = target.apply(this, args);

			(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
				event,
			);

			return result;
		};

		return renameDecorated(replacement, { name: String(context.name) });
	};
}
