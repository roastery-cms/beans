import type { CommandRegistrySpecBase } from "@/application/command/types";
import type { CommandRunnersOf } from "@/application/command-registry/types";
import type { IEventedRegistry } from "./ievented-registry.interface";

/**
 * What `eventedRegistry(spec, emitter).withDependencies(deps)` actually
 * returns: the named members {@link IEventedRegistry} declares (`get`, `on`),
 * plus one accessor per registrable spec key (`CommandRunnersOf`).
 *
 * @remarks
 * `CommandRunnersOf` is reused verbatim from the command-registry pillar
 * rather than restated here: the accessor half is keyed by the very same
 * `RegistrableKeys` union, and the runners it types are the *decorated* ones
 * this pillar builds — which differ in behaviour (they auto-publish and
 * react) but not in shape.
 *
 * An intersection for the same reason `CommandRegistryOf` is one: a
 * TypeScript interface cannot declare a mapped type over a generic key union.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `EventedRegistryBuilder.withDependencies` — returns this.
 * @see `IEventedRegistry.on` — returns this too, so chaining preserves the accessors.
 */
export type EventedRegistryOf<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = IEventedRegistry<Spec, Dependencies> & CommandRunnersOf<Spec, Dependencies>;
