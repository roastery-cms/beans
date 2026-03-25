export class EntityStorage {
	private readonly items: Record<string, string>;

	public constructor() {
		this.items = {};
	}

	public get(key: string): string | null {
		return key in this.items ? this.items[key]! : null;
	}

	public set(key: string, value: string): void {
		this.items[key] = value;
	}

	public del(key: string): void {
		delete this.items[key];
	}
}
