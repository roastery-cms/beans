import type { AnyPropertyClass } from "./any-property-class.type";
import type { InputValueOf } from "./input-value-of.type";
import type { InputValuesOf } from "./input-values-of.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";

/**
 * One property's set handler: the business rule a blueprint key runs **before**
 * its value is built, on both construction and mutation.
 *
 * It receives the raw value about to be set and the same read-only view of the
 * whole raw payload a `derive` rule already gets, so a rule may read the
 * property's siblings without touching the half-built instance. Its return is
 * `void` by design — a handler enforces by **throwing** (the exception is the
 * domain's own choice) and never rewrites the value. Normalising a value stays
 * the value-object's `transform`.
 *
 * Because it runs before the value is built, the handler sees the value ahead
 * of the value-object's own schema validation: the business rule precedes the
 * schema, not the other way around.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 * @typeParam Class - The property class the handled key is backed by.
 *
 * @see `SetHandlersOf` in `./set-handlers-of.type` — the map these live in.
 * @see `PropertyRule` in `./property-rule.type` — the same `raw` view, on the
 *   producing side.
 *
 * @example
 * ```ts
 * const handler: SetHandlerOf<typeof postProperties, typeof TitleVO> = (
 *   value,
 *   raw,
 * ) => {
 *   if (raw.hidden && value.length > 40)
 *     throw new InvalidPropertyException("title", "post");
 * };
 * ```
 */
export type SetHandlerOf<
	PropertiesShape extends PropertiesShapeBase,
	Class extends AnyPropertyClass,
> = (
	value: InputValueOf<Class>,
	raw: Readonly<InputValuesOf<PropertiesShape>>,
) => void;
