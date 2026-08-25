import type { SerializedValuesOf } from "@/domain/entity/types/serialized-values-of.type";
import { modelFor } from "@/domain/record/helpers/model-for";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import type { PayloadShapeBase } from "../types/payload-shape-base.type";

/**
 * Validates a payload that arrived from outside the process against the shape
 * a domain event declared, and hands it back typed.
 *
 * @typeParam Shape - The payload shape the event declares.
 *
 * @param shape - The event's declared payload shape.
 * @param name - The event name, used as the exception's `source`.
 * @param payload - The `payload` key of a received `IDomainEvent`.
 * @returns The same payload, typed against the shape.
 * @throws `InvalidDomainDataException` — when the payload does not match the
 *   shape: a missing key, an extra key, or a value of the wrong type.
 *
 * @remarks
 * The model comes from the **record** pillar's `modelFor`, not the entity's,
 * and that is the whole reason this function is one line of logic. A record
 * model seeds an empty `t.TProperties` — no `id`, no `createdAt`, no
 * `updatedAt` at the root — while delegating a nested entity key to the
 * entity's `modelFor`, which seeds those three. That is exactly the payload
 * `eventPayloadOf` produces: the root's identity dropped because `aggregateId`
 * already carries it, every nested aggregate's identity kept because that is
 * what makes the payload hydratable one level down.
 *
 * It derives a schema and returns the plain object — it never mints a class.
 * So the shape's keys do not go through `installAccessors` and cannot collide
 * with a base member (`equals`, `schema`, `toJSON`, …), and the payload stays
 * what it is: wire data. A domain event has no `set`.
 *
 * The exception is the **domain**-layer one, matching `Entity.fromJSON`. An
 * event arriving off a bus is untrusted input, but it is not a `Command`'s own
 * input crossing that command's boundary, which is the only thing that re-tags
 * to the application layer.
 *
 * @example
 * ```ts
 * const payload = validatePayload(shipmentShape, "order.shipped", raw.payload);
 * ```
 *
 * @see `eventPayloadOf` in `@roastery/beans/domain/entity/helpers` — produces what this accepts.
 * @see `Entity.fromJSON` in `@roastery/beans/domain/entity` — the same guard, one pillar over.
 */
export function validatePayload<const Shape extends PayloadShapeBase>(
	shape: Shape,
	name: string,
	payload: unknown,
): SerializedValuesOf<Shape> {
	if (!SchemaManager.match(modelFor(shape, name), payload))
		throw new InvalidDomainDataException(
			name,
			`DomainEvent: the payload received for "${name}" does not match its declared shape — a missing key, an extra key, or a value of the wrong type.`,
		);

	return payload as SerializedValuesOf<Shape>;
}
