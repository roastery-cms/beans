import type { BareDomainEventClass } from "../types/bare-domain-event-class.type";
import type { EntityErrorEventFactory } from "../types/entity-error-event-factory.type";

/**
 * Tells a payload-less bare event-class reference apart from an
 * {@link EntityErrorEventFactory} — the two shapes `onError` accepts.
 *
 * Both are plain JS functions (`typeof value === "function"` either way),
 * so the `typeof`-based discriminant `Entity.raiseEvent` itself uses (an
 * already-*built* object vs a bare *class* function) doesn't carry over
 * here — the two candidates in play are both functions, not one function
 * and one object.
 *
 * The check instead reads the own property descriptor of `prototype`. A
 * `class` declaration's `prototype` is spec-mandated non-writable
 * (ECMA-262 §15.7.14); an ordinary `function` factory's `prototype` is
 * writable; an arrow-function factory has no own `prototype` property at
 * all (arrow functions are never constructible, so they don't get one).
 * All three collapse cleanly to one signal: `writable === false` means,
 * unambiguously, "a class" — verified directly against this runtime rather
 * than assumed, since it is the one place in the package that leans on a
 * JS engine internal instead of a purely structural check.
 *
 * @param value - Either shape `onError` accepts.
 * @returns `true` when `value` is a bare event-class reference.
 */
export function isBareEventClass(
	value: BareDomainEventClass | EntityErrorEventFactory,
): value is BareDomainEventClass {
	return (
		Object.getOwnPropertyDescriptor(value, "prototype")?.writable === false
	);
}
