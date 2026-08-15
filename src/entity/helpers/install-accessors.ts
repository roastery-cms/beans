import { PropertyNameCollisionException } from "@roastery/terroir/exceptions/domain";
import type { PropertiesShapeBase } from "../types";

/**
 * Registry of the accessor keys already installed per prototype. Keyed by the
 * prototype object itself so subclass chains can be walked and re-installation
 * short-circuits.
 */
const accessors = new WeakMap<object, ReadonlySet<string>>();

/**
 * Collects every accessor key an ancestor prototype already covers, walking
 * the chain upwards.
 *
 * @param prototype - The prototype whose chain to walk.
 * @returns The union of all ancestor-installed keys.
 */
function inheritedAccessorKeys(prototype: object): Set<string> {
	const inherited = new Set<string>();

	for (
		let current: object | null = prototype;
		current !== null;
		current = Object.getPrototypeOf(current) as object | null
	)
		for (const key of accessors.get(current) ?? []) inherited.add(key);

	return inherited;
}

/**
 * Installs one read-only accessor per blueprint key on the class prototype,
 * each delegating to `this.get(key)`. Runs once per class (subsequent calls
 * short-circuit) and only defines the keys no ancestor already covers — so a
 * subclass with a wider blueprint gains accessors for its new keys without
 * tripping the collision guard on the ancestor's own accessors.
 *
 * The install is atomic: every missing key is checked for collisions before
 * any accessor is defined, so a rejected attempt leaves the prototype
 * untouched and the next attempt throws again.
 *
 * @param prototype - The class prototype to install on.
 * @param properties - The blueprint whose keys become accessors.
 * @param source - Entity-type name, used as the `source` of the exception.
 *
 * @throws `PropertyNameCollisionException` — when a blueprint key collides with
 *   an existing member of the entity (`schema`, `toJSON`, `get`, `set`, `id`, …).
 */
export function installAccessors(
	prototype: object,
	properties: PropertiesShapeBase,
	source: string,
): void {
	if (accessors.has(prototype)) return;

	const keys = Object.keys(properties);
	const inherited = inheritedAccessorKeys(prototype);
	const missing = keys.filter((key) => !inherited.has(key));

	for (const key of missing)
		if (key in prototype)
			throw new PropertyNameCollisionException(
				key,
				source,
				`Entity: the blueprint property "${key}" collides with an existing member of the entity and cannot become an accessor. Rename it.`,
			);

	for (const key of missing)
		Object.defineProperty(prototype, key, {
			configurable: true,
			enumerable: false,
			get(this: { get(name: string): unknown }): unknown {
				return this.get(key);
			},
		});

	accessors.set(prototype, new Set(keys));
}
