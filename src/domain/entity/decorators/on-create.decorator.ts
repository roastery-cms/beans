import { Source } from "@roastery/terroir/symbols";
import { extractIdentity } from "../helpers/extract-identity";
import { renameDecorated } from "./helpers/rename-decorated";
import type { BareDomainEventClass } from "./types/bare-domain-event-class.type";
import type { EntityLifecycleDecorator } from "./types/entity-lifecycle-decorator.type";

/**
 * Class decorator: raises `event` whenever the decorated `Entity` is
 * constructed **fresh** — no `id`/`createdAt` in the payload, so the base
 * generates a new identity, including via `.demo()`. A hydration (payload
 * carrying an existing identity, or `X.fromJSON(row)`) does **not** fire it.
 *
 * Sugar over calling `this.raiseEvent(event)` by hand at the end of a
 * subclass's own constructor; the two are equivalent, and stacking this
 * decorator on a class whose constructor also raises the event manually
 * would raise it twice.
 *
 * The wrapper calls the constructor through unchanged, then reads the raw
 * argument with {@link extractIdentity} — the exact rule `Entity`'s own
 * construction already applies — to tell a fresh construction from a
 * hydration. By then `super(...args)` has already returned: if the identity
 * were malformed (half present), `Entity`'s constructor would have thrown
 * `IncompleteIdentityException` before control ever reached here, so calling
 * `extractIdentity` again on the same argument is redundant but safe, never
 * the first place the check runs. The `Demo` sentinel `.demo()` passes
 * through this same channel needs no special case either: destructuring
 * `id`/`createdAt`/`updatedAt` off a symbol yields `undefined` for all three
 * in plain JS, so it lands in the same "no identity" branch a fresh payload
 * does — `.demo()` counts as a create.
 *
 * @param event - A payload-less `DomainEvent` subclass reference (a
 *   constructor taking only `aggregateId`) — the same bare-class form
 *   `Entity.raiseEvent` already accepts without `new`.
 * @returns A class decorator wrapping the constructor.
 *
 * @example
 * ```ts
 * @onCreate(UserCreated)
 * class User extends Entity<typeof userProperties> {
 *   protected defineEntity(): EntityDefinition<typeof userProperties> {
 *     return { properties: userProperties, source: "user" };
 *   }
 * }
 *
 * new User({ name: "Alan" });                // raises UserCreated
 * User.demo();                               // also raises it — a fresh identity either way
 * User.fromJSON(row);                        // does not: the payload carried an identity
 * ```
 */
export function onCreate(
	event: BareDomainEventClass,
): EntityLifecycleDecorator {
	return (target, _context) => {
		// `abstract` satisfies the compiler's mixin rules (TS2515) without
		// implementing `defineEntity` again — `target` already does, TS just
		// can't see that through the generic constructor type. Never
		// constructed as `Decorated` directly; always cast away below.
		abstract class Decorated extends target {
			// biome-ignore lint/suspicious/noExplicitAny: TS's mixin pattern requires the rest parameter to be exactly `any[]` — see TS2545.
			public constructor(...args: any[]) {
				super(...args);

				const raw = args[0] as Record<string, unknown> | undefined;

				if (extractIdentity(this[Source], raw) === undefined)
					(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(
						event,
					);
			}
		}

		return renameDecorated(Decorated, target) as unknown as typeof target;
	};
}
