import { renameDecorated } from "./helpers/rename-decorated";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityLifecycleDecorator } from "./types/entity-lifecycle-decorator.type";

/**
 * Class decorator: raises `event` the first time `destroy()` is called on
 * the decorated `Entity`. `destroy()` is idempotent (a second call is a
 * no-op) — this checks `isDestroyed` **before** delegating to `super.destroy()`
 * so a repeated call never raises the event twice.
 *
 * @param event - A payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`) — the same bare-class form
 *   `Entity.raiseEvent` already accepts without `new`.
 * @returns A class decorator.
 *
 * @example
 * ```ts
 * @onDelete(UserDeleted)
 * class User extends Entity<typeof userProperties> {
 *   protected defineEntity(): EntityDefinition<typeof userProperties> {
 *     return { properties: userProperties, source: "user" };
 *   }
 * }
 *
 * const user = new User({ name: "Alan" });
 * user.destroy(); // raises UserDeleted
 * user.destroy(); // already destroyed — does not raise it again
 * ```
 */
export function onDelete(
	event: BareDomainEventClass,
): EntityLifecycleDecorator {
	return (target, _context) => {
		// `abstract` satisfies the compiler's mixin rules (TS2515) without
		// re-implementing `defineEntity` — `target` already does, TS just
		// can't see that through the generic constructor type. Never
		// constructed as `Decorated` directly; always cast away below.
		abstract class Decorated extends target {
			public override destroy(): void {
				const already = this.isDestroyed;

				super.destroy();

				if (!already)
					(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
						event,
					);
			}
		}

		return renameDecorated(Decorated, target) as unknown as typeof target;
	};
}
