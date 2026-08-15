import type { BaseContext } from "./base-context.type";
import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * The built property map an `Entity` instance keeps under `[Context]`: the
 * identity value-objects plus one **instance** (value-object or nested entity)
 * per blueprint key.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @see {@link BaseContext} — the identity slice.
 */
export type ContextOf<PropertiesShape extends PropertiesShapeBase> =
	BaseContext & {
		[Key in DomainKeys<PropertiesShape>]: PropertiesShape[Key]["prototype"];
	};
