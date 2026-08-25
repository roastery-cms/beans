import type { SerializedValuesOf } from "@/domain/entity/types/serialized-values-of.type";
import type { DomainEventClassOf } from "./domain-event-class-of.type";
import type { PayloadShapeBase } from "./payload-shape-base.type";

/**
 * The class `defineDomainEvent(name, shape)` returns: a `DomainEventClassOf`
 * that also declares the shape it carries and can validate an arriving payload
 * against it.
 *
 * @typeParam Shape - The payload shape the event declares.
 *
 * @remarks
 * The constructor is unchanged — still `new (aggregateId: string)` — because
 * the payload comes from the **entity that raises the event**, never from the
 * constructor. That is what keeps every payload-carrying event assignable to
 * `BareDomainEventClass`, and so what lets `@onCreate`, `@onUpdate`,
 * `@onDelete` and `@emit` accept one without a signature change.
 *
 * `payload` is a plain `static`, read structurally, following
 * `static readonly definition` and `static readonly transactional` — a
 * hand-written subclass declaring the same static counts, and a subclass
 * inherits it.
 *
 * Annotating `defineDomainEvent`'s return with this alias is mandatory: an
 * inferred return type on a factory that returns a class declared in its own
 * body fails the declaration build with **TS4060** and emits no `.d.ts`.
 *
 * @see {@link SerializedDomainEventClassOf} — the `Json`/`SafeJson` counterpart,
 *   which has no `fromJSON` because it has no static format to validate.
 */
export type PayloadDomainEventClassOf<Shape extends PayloadShapeBase> =
	DomainEventClassOf & {
		/** The shape this event carries — the target of the cut and the blueprint of the check. */
		readonly payload: Shape;

		/**
		 * Validates a payload that arrived from outside — off a bus, a queue, a
		 * log — against the declared shape, and hands it back typed.
		 *
		 * @param payload - The `payload` key of a received `IDomainEvent`.
		 * @returns The same payload, typed against the shape.
		 * @throws `InvalidDomainDataException` when the payload does not match the
		 *   shape — a missing key, an extra key, or a value of the wrong type.
		 */
		fromJSON(payload: unknown): SerializedValuesOf<Shape>;
	};
