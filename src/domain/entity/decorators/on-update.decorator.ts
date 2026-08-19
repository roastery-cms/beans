import { renameDecorated } from "./helpers/rename-decorated";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityLike } from "./types/entity-constructor.type";
import type { EntityLifecycleDecorator } from "./types/entity-lifecycle-decorator.type";

/**
 * Class decorator: raises `event` whenever `set`/`setMany` actually changes
 * something on the decorated `Entity`. Only overrides `setMany` — `set`
 * already delegates to it, and JS method dispatch resolves that call
 * through the real prototype chain, so it reaches this override too.
 *
 * "Actually changes something" is `setMany`'s own return value: it already
 * computes that flag to decide whether to stamp `updatedAt`, so the decorator
 * reads it directly instead of re-deriving it. Comparing `updatedAt` before
 * and after would look equivalent and is not — the stamp is an ISO string
 * with millisecond resolution, so two genuinely distinct mutations landing in
 * the same millisecond would compare equal and the second event would be
 * silently swallowed.
 *
 * @param event - A payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`) — the same bare-class form
 *   `Entity.raiseEvent` already accepts without `new`.
 * @returns A class decorator.
 *
 * @example
 * ```ts
 * @onUpdate(UserUpdated)
 * class User extends Entity<typeof userProperties> {
 *   protected defineEntity(): EntityDefinition<typeof userProperties> {
 *     return { properties: userProperties, source: "user" };
 *   }
 *
 *   public rename(name: string): void {
 *     this.set("name", name); // set/setMany are protected — only reachable from here
 *   }
 * }
 *
 * const user = new User({ name: "Alan" });
 * user.rename("Alan Reis"); // raises UserUpdated
 * user.rename("Alan Reis"); // no change — does not raise it again
 * ```
 */
export function onUpdate(
	event: BareDomainEventClass,
): EntityLifecycleDecorator {
	return (target, _context) => {
		// `setMany` is `protected` on `Entity`, and `EntityLike` (the shared
		// mixin bound `target` is generically constrained by) deliberately
		// omits it — a structural type can't express "protected", so keeping
		// it there would make every decorated class fail the bound (see
		// `EntityLike`'s own doc comment). This local cast regains just enough
		// of `target`'s real (runtime-present) shape to declare the override
		// below; the mixin's own return cast (`as unknown as typeof target`)
		// hides it again behind the original, still-protected signature, so
		// external code calling `.setMany()`/`.set()` on a decorated instance
		// is rejected exactly as it would be on an undecorated one.
		const CastBase = target as unknown as new (
			// biome-ignore lint/suspicious/noExplicitAny: mirrors EntityConstructor's own mixin-parameter shape — see TS2545.
			...args: any[]
		) => EntityLike & { setMany(values: Record<string, unknown>): boolean };

		// `abstract` satisfies the compiler's mixin rules (TS2515) without
		// re-implementing `defineEntity` — `target` already does, TS just
		// can't see that through the generic constructor type. Never
		// constructed as `Decorated` directly; always cast away below.
		abstract class Decorated extends CastBase {
			public override setMany(values: Record<string, unknown>): boolean {
				const changed = super.setMany(values);

				if (changed)
					(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
						event,
					);

				return changed;
			}
		}

		return renameDecorated(Decorated, target) as unknown as typeof target;
	};
}
