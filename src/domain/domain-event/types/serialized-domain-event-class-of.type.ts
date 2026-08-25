import type { Json, SafeJson } from "@roastery/terroir/symbols";
import type { DomainEventClassOf } from "./domain-event-class-of.type";

/**
 * The class `defineDomainEvent(name, Json)` or `defineDomainEvent(name, SafeJson)`
 * returns: a `DomainEventClassOf` that declares which serialization of the
 * raising entity it carries.
 *
 * @remarks
 * There is deliberately **no `fromJSON`**. The payload is the raising entity's
 * whole serialization, and an event class does not know which entity raised it
 * — so there is no static format to validate an arrival against. That asymmetry
 * is the argument for preferring the shape form, in the same way
 * `sensitive: true` on a value object being the only declaration that closes a
 * repository port is the argument for preferring it over a per-aggregate list.
 *
 * A consumer that needs the arriving payload validated should declare a shape
 * instead, or hydrate it through the receiving aggregate's own `fromJSON`.
 *
 * @see {@link PayloadDomainEventClassOf} — the shape form, which does validate.
 */
export type SerializedDomainEventClassOf = DomainEventClassOf & {
	/** Which serialization of the raising entity this event carries. */
	readonly payload: typeof Json | typeof SafeJson;
};
