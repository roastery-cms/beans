/**
 * Per-entity transient `string → string` cache.
 *
 * Attached to every `Entity` instance under the `Storage` symbol (from
 * `@roastery/terroir/symbols`) so subclasses can park values that belong to the
 * entity but don't deserve a place in the blueprint (cached lookups, derived
 * flags, conversation state, etc.). The slot is `protected` — a subclass
 * exposes whatever facade it wants over `this[Storage]` — and it never reaches
 * `toJSON()` or the derived schema.
 *
 * The store is **deliberately stringly-typed**: callers serialise on the way in
 * and parse on the way out. This keeps the runtime shape uniform and makes the
 * storage trivially serialisable for tests and snapshots. If you need a typed
 * value, wrap the access at the call-site rather than generalising this class.
 *
 * @see `Storage` in `@roastery/terroir/symbols` — the symbol keying the
 *   per-entity instance.
 *
 * @example
 * ```ts
 * import { Storage } from "@roastery/terroir/symbols";
 * import { Entity } from "@roastery/beans";
 *
 * class Post extends Entity<typeof postProperties> {
 *   public addTag(tag: string): void {
 *     const current = this[Storage].get("tags") ?? "";
 *     this[Storage].set("tags", current ? `${current},${tag}` : tag);
 *   }
 *
 *   public getTags(): string[] {
 *     return (this[Storage].get("tags") ?? "").split(",").filter(Boolean);
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
