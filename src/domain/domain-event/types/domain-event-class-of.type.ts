import type { DomainEvent } from "../domain-event";

/**
 * The **class** {@link defineDomainEvent} returns — not an instance.
 *
 * The class is declared *inside* the factory body, so without a named public
 * type the declaration build fails with TS4060 (`Return type of exported
 * function has or is using private name`). The package emits declarations
 * (`tsconfig.build.json` sets `declaration: true` and `bun run build` runs
 * `tsup --dts`), so an inferred return type would simply not compile.
 *
 * Unlike {@link ValueObjectClassOf} in
 * `@roastery/beans/domain/collections/value-objects/custom/types`,
 * `DomainEvent` takes no type parameters, so this alias needs none either.
 * The shape matches `Entity.raiseEvent`'s inline bare-class type (`new
 * (aggregateId: string) => Event`) and `BareDomainEventClass` in
 * `@roastery/beans/domain/entity/decorators/types` structurally — no import
 * from either is needed for a class produced here to work with both.
 *
 * @see `defineDomainEvent` — the factory returning this shape.
 * @see {@link DomainEvent} — the base class every generated event extends.
 */
export type DomainEventClassOf = {
	/** Instance side — every generated class extends `DomainEvent`. */
	readonly prototype: DomainEvent;

	/** Mirrors the base constructor: only `aggregateId` is required. */
	new (aggregateId: string): DomainEvent;
};
