/**
 * @module @roastery/beans/domain/entity/decorators
 *
 * Two kinds of standard (TC39) decorator for an `Entity` subclass, both
 * raising a declared domain event so a subclass stops having to call
 * `this.raiseEvent(...)` by hand: three **class decorators** for fixed
 * lifecycle points, and two **method decorators** for an arbitrary
 * business operation.
 *
 * **None of the five applies to a `DomainRecord` subclass.** Every one of them
 * ends in `raiseEvent`, which a record does not have — a record forwards a
 * deep event drain but never raises. Nothing guards against it at runtime
 * (same stance the pillar takes everywhere else); the call simply fails at the
 * `raiseEvent` cast. `onUpdate` is the most tempting of the five, since a
 * record *does* have `setMany`, and therefore the most important to name here.
 *
 * Re-exports:
 * - {@link emit} — method decorator: raises an event once the decorated method has run to completion (never on a thrown exception).
 * - {@link onError} — method decorator: catches an exception the decorated method throws, raises an event built from it, then re-throws the original error.
 * - {@link fromClass} — wraps a payload-less bare event-class reference into the factory shape `onError` needs internally; exported for when that factory value is needed on its own.
 * - {@link onCreate} — class decorator: raises an event on a fresh construction (no `id`/`createdAt`, including `.demo()`).
 * - {@link onUpdate} — class decorator: raises an event whenever `set`/`setMany` actually changes something.
 * - {@link onDelete} — class decorator: raises an event the first time `destroy()` is called.
 *
 * **`onError` never swallows.** It always re-throws the caught error after
 * raising its event — the decorated method's observable behaviour is
 * unchanged for its caller. This is a different `onError` than the one on
 * `commands` (`@roastery/beans/application/commands`), which
 * isolates a throwing event *reaction* by swallowing it; this one wraps an
 * `Entity` business method and only ever adds a side-channel event.
 *
 * **`onError` reads the same way the other four decorators do.**
 * `@onError(SomeEvent)` accepts a bare class directly, exactly like
 * `@onCreate(SomeEvent)` — internally normalized through {@link fromClass}.
 * Reach for the factory form, `@onError((error) => ...)`, only when the
 * event needs to carry the caught error in its own payload.
 *
 * **There is deliberately no `onRead`.** Hydration is not a domain fact: a
 * repository rebuilding an entity through `fromJSON` changes nothing, and an
 * event raised there would ride along in every `CommandResult` — a command
 * that merely loads an aggregate to delete it would surface a "read" event
 * next to the real one. Audit a read where the read actually happens, in the
 * repository.
 *
 * **`emit` stacks with `onError` and with the three lifecycle decorators,
 * independently.** Whichever method decorator is written closer to the
 * method wraps innermost, each bracketing whatever it wraps — including
 * another decorator's own wrapper. `emit` and `onError` on the same method
 * are mutually exclusive per call by construction: a clean run reaches only
 * `emit`'s raise, a throw reaches only `onError`'s. Two stacked `emit`s both
 * fire, the innermost one first.
 *
 * **On a nested entity, pull deep.** A decorated class used as another
 * blueprint's property raises into its **own** buffer — `onCreate` fires on
 * every construction of the parent, since building the parent builds it too.
 * A plain `parent.pullDomainEvents()` does not see those; either decorate
 * only aggregate roots, or drain with `parent.pullDomainEvents({ deep: true })`
 * (which is what `collectDomainEvents` already does).
 *
 * @example
 * ```ts
 * @onCreate(UserCreated)
 * @onUpdate(UserUpdated)
 * @onDelete(UserDeleted)
 * class User extends Entity<typeof userProperties> {
 *   protected defineEntity(): EntityDefinition<typeof userProperties> {
 *     return { properties: userProperties, source: "user" };
 *   }
 *
 *   @emit(UserPromoted)
 *   public promote(): void {
 *     // business logic
 *   }
 * }
 * ```
 */

export { emit } from "./emit.decorator";
export { fromClass } from "./helpers/from-class";
export { onCreate } from "./on-create.decorator";
export { onDelete } from "./on-delete.decorator";
export { onError } from "./on-error.decorator";
export { onUpdate } from "./on-update.decorator";
