/**
 * Per-entity transient `string → string` cache.
 *
 * Attached to every {@link Entity} instance via the homonymous {@link EntityStorage}
 * symbol so subclasses can park values that belong to the entity but don't deserve
 * a public field on the DTO (cached lookups, derived flags, conversation state, etc.).
 *
 * The store is **deliberately stringly-typed**: callers serialise on the way in and
 * parse on the way out. This keeps the runtime shape uniform and makes the storage
 * trivially serialisable for tests and snapshots. If you need a typed value, wrap
 * the access at the call-site rather than generalising this class.
 *
 * The class name `EntityStorage` is shared with the symbol of the same name used
 * to key the per-entity instance — they are paired by design.
 *
 * @see {@link EntityStorage} (symbol) — protected accessor on `Entity` that returns this class.
 *
 * @example
 * ```ts
 * import { Entity } from "@roastery/beans";
 * import { EntityStorage } from "@roastery/beans/entity";
 *
 * class Post extends Entity<typeof PostDTO> {
 *   public addTag(tag: string): void {
 *     const current = this[EntityStorage].get("tags") ?? "";
 *     this[EntityStorage].set("tags", current ? `${current},${tag}` : tag);
 *   }
 *
 *   public getTags(): string[] {
 *     return (this[EntityStorage].get("tags") ?? "").split(",").filter(Boolean);
 *   }
 * }
 * ```
 */
export class EntityStorage {
	private readonly items: Record<string, string>;

	/** Initialises an empty store. Each entity instance owns its own. */
	public constructor() {
		this.items = {};
	}

	/**
	 * Returns the value stored under `key`, or invokes `fallback` when no entry exists.
	 *
	 * The `fallback` overload narrows the return type to a non-nullable `string`,
	 * letting callers skip null-checks at the call site.
	 *
	 * @param key - Storage key.
	 * @param fallback - Computes a `string` to return when the key is absent.
	 * @returns The stored value, or the fallback's result.
	 */
	public get(key: string, fallback: () => string): string;
	/**
	 * Returns the value stored under `key`, or `null` when no entry exists.
	 *
	 * @param key - Storage key.
	 * @returns The stored value, or `null` when the key was never set / has been removed.
	 */
	public get(key: string): string | null;
	public get(key: string, fallback?: () => string): string | null {
		if (key in this.items) return this.items[key]!;
		return fallback ? fallback() : null;
	}

	/**
	 * Stores `value` under `key`, overwriting any prior entry. Returns `value`
	 * unchanged so a `set` call can be chained inline.
	 *
	 * @param key - Storage key.
	 * @param value - Value to persist.
	 * @returns The same `value` that was passed in (for chaining ergonomics).
	 */
	public set(key: string, value: string): string {
		this.items[key] = value;

		return value;
	}

	/**
	 * Removes the entry for `key`. No-op when the key does not exist.
	 *
	 * @param key - Storage key to clear.
	 */
	public del(key: string): void {
		delete this.items[key];
	}
}
