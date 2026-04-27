export class EntityStorage {
	private readonly items: Record<string, string>;

	public constructor() {
		this.items = {};
	}

	public get(key: string, fallback: () => string): string;
	public get(key: string): string | null;
	public get(key: string, fallback?: () => string): string | null {
		if (key in this.items) return this.items[key]!;
		return fallback ? fallback() : null;
	}

	public set(key: string, value: string): string {
		this.items[key] = value;

		return value;
	}

	public del(key: string): void {
		delete this.items[key];
	}
}
