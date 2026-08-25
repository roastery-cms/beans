import type { Json, SafeJson } from "@roastery/terroir/symbols";
import { DomainEvent } from "./domain-event";
import { validatePayload } from "./helpers/validate-payload";
import type {
	DomainEventClassOf,
	EventPayloadDeclaration,
	PayloadDomainEventClassOf,
	PayloadShapeBase,
	SerializedDomainEventClassOf,
} from "./types";

/**
 * Builds a payload-less `DomainEvent` subclass from just its name.
 *
 * @param name - The stable, dot-namespaced event name (e.g. `"order.cancelled"`).
 * @returns A concrete `DomainEvent` class whose constructor takes only `aggregateId`.
 */
export function defineDomainEvent(name: string): DomainEventClassOf;

/**
 * Builds a `DomainEvent` subclass that carries the declared cut of the entity
 * raising it, and can validate that cut on arrival.
 *
 * @typeParam Shape - The payload shape.
 *
 * @param name - The stable, dot-namespaced event name.
 * @param payload - The shape the raising entity is cut down to.
 * @returns A concrete `DomainEvent` class carrying `payload` and `fromJSON`.
 */
export function defineDomainEvent<const Shape extends PayloadShapeBase>(
	name: string,
	payload: Shape,
): PayloadDomainEventClassOf<Shape>;

/**
 * Builds a `DomainEvent` subclass that carries the raising entity's whole
 * serialization — complete (`Json`) or redacted (`SafeJson`).
 *
 * @param name - The stable, dot-namespaced event name.
 * @param payload - `Json` or `SafeJson`, from `@roastery/terroir/symbols`.
 * @returns A concrete `DomainEvent` class carrying `payload`, and **no** `fromJSON`.
 */
export function defineDomainEvent(
	name: string,
	payload: typeof Json | typeof SafeJson,
): SerializedDomainEventClassOf;

/**
 * Builds a `DomainEvent` subclass from a name, and optionally a declaration of
 * what it carries.
 *
 * @param name - The stable, dot-namespaced event name.
 * @param payload - A payload shape, `Json`, `SafeJson`, or nothing at all.
 * @returns The generated class, named after the event.
 *
 * @remarks
 * **A payload is always opt-in.** Called with one argument this is exactly what
 * it has always been, and an event that declares nothing still buffers as
 * `{ name, occurredAt, aggregateId }`.
 *
 * **The declaration lives here and nowhere else.** `@onCreate`, `@onUpdate`,
 * `@onDelete` and `@emit` take no second argument — they read the static off
 * the class they already receive. A second place to declare it would be a
 * second source free to diverge from this one in silence. It is also what lets
 * the far side of a bus validate what arrived: `.on(OrderShipped, Handler)`
 * already hands the consumer the same class.
 *
 * **The constructor is unchanged** — still `new (aggregateId: string)` — because
 * the payload comes from the entity, not from the constructor. That is what
 * keeps a payload-carrying event assignable to `BareDomainEventClass`, and so
 * what lets all four decorators accept one with no signature change.
 *
 * **Only the shape form gets `fromJSON`.** `Json` and `SafeJson` produce the
 * raising entity's whole serialization, and an event class does not know which
 * entity raised it — there is no static format to check an arrival against.
 *
 * `payload` is a plain `static`, read structurally, following
 * `static readonly definition` and `static readonly transactional`: a
 * hand-written subclass declaring the same static counts, and a subclass
 * inherits it.
 *
 * **Call this at module scope, once.** Each call mints a fresh class *and*,
 * with a shape, a fresh schema: two calls with the same name produce classes
 * `instanceof` does not relate, and a call inside `defineEntity()` recompiles
 * per construction — silently, only slower.
 *
 * @example
 * ```ts
 * const OrderCancelled = defineDomainEvent("order.cancelled");
 * const OrderAudited = defineDomainEvent("order.audited", SafeJson);
 * const OrderShipped = defineDomainEvent("order.shipped", {
 * 	total: IntegerVO,
 * 	to: AddressCard,
 * });
 *
 * class Order extends entityOf(orderProperties, "order") {
 * 	@emit(OrderShipped)
 * 	public ship(): void {}
 * }
 *
 * // on the far side of the bus
 * const { total } = OrderShipped.fromJSON(received.payload);
 * ```
 *
 * @see `eventPayloadOf` in `@roastery/beans/domain/entity/helpers` — resolves the declaration at raise time.
 * @see {@link DomainEvent} — the base, for an event that needs a hand-written body.
 */
export function defineDomainEvent(
	name: string,
	payload?: EventPayloadDeclaration,
):
	| DomainEventClassOf
	| PayloadDomainEventClassOf<PayloadShapeBase>
	| SerializedDomainEventClassOf {
	class GeneratedDomainEvent extends DomainEvent {
		public static readonly payload: EventPayloadDeclaration | undefined =
			payload;

		protected defineName(): string {
			return name;
		}
	}

	Object.defineProperty(GeneratedDomainEvent, "name", {
		configurable: true,
		value: name,
	});

	// Attached rather than declared in the body because only the shape form has
	// one: a `fromJSON` that exists on a `Json`/`SafeJson` event and throws
	// would be worse than one that is absent. Closes over `payload` and `name`,
	// so it needs no `this` and no `noThisInStatic` suppression.
	if (typeof payload === "object")
		Object.defineProperty(GeneratedDomainEvent, "fromJSON", {
			configurable: true,
			value: (received: unknown): unknown =>
				validatePayload(payload, name, received),
		});

	// The cast covers the same gap `defineValueObject` covers with its own
	// cast: TypeScript can't prove on its own that the class declared above
	// satisfies the public alias, only that it satisfies `DomainEvent`.
	return GeneratedDomainEvent as unknown as DomainEventClassOf;
}
