import { renameDecorated } from "./rename-decorated";
import type { BareDomainEventClass } from "../types/bare-domain-event-class.type";
import type { EntityMethodDecorator } from "../types/entity-method-decorator.type";

/**
 * Builds the method decorator `beforeHandle`/`afterHandle` return: wraps an
 * arbitrary `Entity` instance method so it raises `event` immediately before
 * or immediately after the method body runs, depending on `runBefore`.
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
 *   `Entity.raiseEvent` already accepts without `new`.
 * @param runBefore - `true` to raise before the method body runs
 *   (`beforeHandle`), `false` to raise after it returns (`afterHandle`).
 * @returns A method decorator.
 */
export function methodHandleDecorator(
	event: BareDomainEventClass,
	runBefore: boolean,
): EntityMethodDecorator {
	return (target, context) => {
		const replacement: typeof target = function (...args) {
			if (runBefore)
				(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
					event,
				);

			const result = target.apply(this, args);

			if (!runBefore)
				(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
					event,
				);

			return result;
		};

		return renameDecorated(replacement, { name: String(context.name) });
	};
}
