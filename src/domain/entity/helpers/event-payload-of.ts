import type { EventPayloadDeclaration } from "@/domain/domain-event/types/event-payload-declaration.type";
import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import { Json, SafeJson } from "@roastery/terroir/symbols";
import type { ReshapableModel } from "../types/reshapable-model.type";
import { RAW_ENTITY_KEYS } from "./raw-entity-keys";
import { reshapeTo } from "./reshape-to";

/**
 * What `eventPayloadOf` cuts from: an `Entity`, in both its serialized forms.
 *
 * Structural rather than `Entity` itself, for the reason every helper in this
 * directory is: naming the class here would put a class inside the import graph
 * `entity.ts` reaches on its way to `reshapeTo`.
 */
type PayloadSource = ReshapableModel & {
	toSafeJSON(): object;
};

/**
 * Resolves what an entity contributes to a domain event it is raising, from the
 * `static readonly payload` the event class declared.
 *
 * @param entity - The entity raising the event — the source of the cut.
 * @param event - The built event, whose class carries the declaration.
 * @returns The payload, or `undefined` when the event declared none.
 * @throws `InvalidEntityDefinitionException` — when `payload` is declared as
 *   something that is neither a shape nor one of the two directives. A compile
 *   error too; this is the runtime half, for a plain-JS caller.
 * @throws `InvalidPropertyException` — from `reshapeTo`, when the shape asks for
 *   a key the entity does not declare, or declares with a different
 *   multiplicity or class. Carries the dotted path.
 *
 * @remarks
 * Three forms, discriminated with nothing to configure: `Json` and `SafeJson`
 * are symbols and a shape is always an object.
 *
 * - **`Json`** — `entity.toJSON()`, complete and unredacted.
 * - **`SafeJson`** — `entity.toSafeJSON()`, with every `sensitive` key redacted.
 *   Redacting breaks the round trip, so this form is for consumption and audit,
 *   never for hydration.
 * - **a shape** — `reshapeTo(shape, entity)` with the root's `id`/`createdAt`/
 *   `updatedAt` dropped, since `aggregateId` already carries the first and the
 *   other two describe the entity rather than the event. Nested identity stays.
 *
 * **The shape is an allowlist, and nothing in it is redacted.** `reshapeTo`
 * cuts from `toJSON()`, never `toSafeJSON()`, so the payload stays hydratable —
 * which means a `sensitive` key named in a shape goes onto the bus in the clear.
 * Leaving it out of the shape is how it stays out; that is the point of
 * declaring one.
 *
 * This function lives in the **entity** pillar rather than in `domain-event/`.
 * `entity/ → domain-event/` is the only direction that exists today, and the
 * comment in `define-domain-event.ts` records that the reverse would be the
 * first dependency back. `reshape-to` is reached by direct path, never through
 * `helpers/index.ts`, which pulls `entity-of.ts` → `entity.ts`.
 *
 * @example
 * ```ts
 * const OrderShipped = defineDomainEvent("order.shipped", { total: IntegerVO });
 *
 * eventPayloadOf(order, new OrderShipped(order.id)); // { total: 1500 }
 * ```
 *
 * @see `Entity.raiseEvent` in `@roastery/beans/domain/entity` — the only caller.
 * @see `validatePayload` in `@roastery/beans/domain/domain-event/helpers` — the arrival half.
 */
export function eventPayloadOf(
	entity: PayloadSource,
	event: object,
): object | undefined {
	const declaration = declarationOf(event);

	if (declaration === undefined) return undefined;

	if (declaration === Json) return entity.toJSON();

	if (declaration === SafeJson) return entity.toSafeJSON();

	if (typeof declaration !== "object")
		throw new InvalidEntityDefinitionException(
			"domain-event",
			"DomainEvent: static payload must be a payload shape, Json or SafeJson. Import the two symbols from @roastery/terroir/symbols — a locally declared one keys nothing.",
		);

	const cut = reshapeTo(declaration, entity) as Record<string, unknown>;

	// `reshapeTo` returns a fresh DTO, never the instance, so deleting here
	// touches nothing the entity owns.
	for (const key of RAW_ENTITY_KEYS) delete cut[key as string];

	return cut;
}

/**
 * Reads the `static readonly payload` off the class the event was built from.
 *
 * Structural, the way `isTransactional` reads its marker: a hand-written
 * `class X extends DomainEvent` declaring the same static counts, and a
 * subclass inherits it. An event raised as a plain object literal has `Object`
 * for a constructor and so declares nothing — which is what keeps a literal
 * carrying its own `payload` key working untouched.
 */
function declarationOf(event: object): EventPayloadDeclaration | undefined {
	const eventClass = event.constructor as
		| { readonly payload?: EventPayloadDeclaration }
		| undefined;

	return eventClass?.payload;
}
