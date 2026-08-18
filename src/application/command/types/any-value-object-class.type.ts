import type { ValueObject } from "@/domain/value-object";
import type { IValueObjectContext } from "@/domain/value-object/types";
import type { t } from "@roastery/terroir";

/**
 * Widest `ValueObject` **class** type: something whose instances are
 * value-objects and whose constructor takes a value plus an identification
 * context.
 *
 * A deliberate copy of the entity pillar's own `AnyValueObjectClass`, built
 * from the value-object pillar's **public** surface (`ValueObject`,
 * `IValueObjectContext`) rather than reaching into `entity/types`, an
 * internal file of a sibling pillar. `Command`'s blueprint only ever holds
 * value-objects — never a nested `Entity` or `Command` — so there is no
 * union to discriminate here, unlike the entity pillar's version.
 *
 * @see {@link CommandPropertiesShapeBase} — the blueprint built from this.
 */
export type AnyValueObjectClass = {
	readonly prototype: ValueObject<unknown, t.TSchema>;
	new (
		value: never,
		context: IValueObjectContext,
	): ValueObject<unknown, t.TSchema>;
};
