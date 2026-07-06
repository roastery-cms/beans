import { describe, expect, it } from "bun:test";
import {
	InvalidDomainDataException,
	InvalidPropertyException,
	OperationFailedException,
} from "@roastery/terroir/exceptions/domain";
import { Schema } from "@roastery/terroir/schema";
import { t } from "@roastery/terroir";
import { DefinedStringVO, SlugVO } from "@/collections/value-objects";
import { Entity } from "./entity";
import { EntityUpdater } from "./entity-updater";
import { makeEntity } from "./factories";
import {
	EntityContext,
	EntityFactory as EntityFactorySymbol,
	EntitySchema,
} from "./symbols";
import type { EntityDTO } from "./dtos";
import type { IRawEntity } from "./types";

// 1. Define Schema
const PostDTO = t.Object({
	id: t.String(),
	createdAt: t.String(),
	updatedAt: t.Optional(t.String()),
	title: t.String(),
	slug: t.String(),
	views: t.Number({ minimum: 0 }),
	tags: t.Array(t.String()),
});

const PostSchema = Schema.make(PostDTO);

type PostInput = Omit<t.Static<typeof PostDTO>, keyof IRawEntity>;

// 2. Define Entity (canonical shape: VO-backed private fields + getters)
class PostEntity extends Entity<typeof PostDTO> {
	public readonly [EntitySchema] = PostSchema;

	private readonly _title: DefinedStringVO;
	private readonly _slug: SlugVO;
	public views: number;
	public tags: string[];

	public run() {}

	public constructor(data: EntityDTO & PostInput) {
		super(data, "post");
		this._title = DefinedStringVO.make(
			data.title,
			this[EntityContext]("title"),
		);
		this._slug = SlugVO.make(data.slug, this[EntityContext]("slug"));
		this.views = data.views;
		this.tags = data.tags;
	}

	public get title(): string {
		return this._title.value;
	}

	public get slug(): string {
		return this._slug.value;
	}

	public [EntityFactorySymbol](
		data: PostInput,
		initialProperties?: EntityDTO,
	): this {
		return new PostEntity({
			...(initialProperties ?? makeEntity()),
			...data,
		}) as this;
	}
}

// 3. Fixtures
const makePost = (): PostEntity =>
	new PostEntity({
		...makeEntity(),
		title: "original",
		slug: "hello-world",
		views: 1,
		tags: ["a", "b"],
	});

/**
 * Mirrors `PostEntity` but its `[EntityFactory]` ignores `initialProperties`,
 * regenerating fresh base props on every rebuild — exercises the
 * `OperationFailedException` guard in `EntityUpdater.run` for factories that
 * fail to preserve identity.
 */
class IdentityDroppingPostEntity extends PostEntity {
	public override [EntityFactorySymbol](data: PostInput): this {
		return new PostEntity({ ...makeEntity(), ...data }) as this;
	}
}

const makeIdentityDroppingPost = (): IdentityDroppingPostEntity =>
	new IdentityDroppingPostEntity({
		...makeEntity(),
		title: "original",
		slug: "hello-world",
		views: 1,
		tags: ["a", "b"],
	});

describe("EntityUpdater", () => {
	describe("run", () => {
		it("should update the property and stamp updatedAt", () => {
			const updater = new EntityUpdater(makePost());

			const updated = updater.run("title", "changed");

			expect(updated).toBeInstanceOf(PostEntity);
			expect(updated.title).toBe("changed");
			expect(updated.updatedAt).toBeDefined();
		});

		it("should preserve id and createdAt through the factory rebuild", () => {
			const entity = makePost();
			const updater = new EntityUpdater(entity);

			const updated = updater.run("views", 42);

			expect(updated.id).toBe(entity.id);
			expect(updated.createdAt).toBe(entity.createdAt);
			expect(updated.views).toBe(42);
		});

		it("should return the same instance and skip updatedAt for an unchanged value", () => {
			const entity = makePost();
			const updater = new EntityUpdater(entity);

			const updated = updater.run("title", "original");

			expect(updated).toBe(entity);
			expect(updated.updatedAt).toBeUndefined();
		});

		it("should treat a deep-equal array as unchanged", () => {
			const entity = makePost();
			const updater = new EntityUpdater(entity);

			const updated = updater.run("tags", ["a", "b"]);

			expect(updated).toBe(entity);
			expect(updated.updatedAt).toBeUndefined();
		});

		it("should treat a value that normalises to the current one as unchanged", () => {
			const entity = makePost();
			const updater = new EntityUpdater(entity);

			// SlugVO slugifies "Hello World" back into the current "hello-world".
			const updated = updater.run("slug", "Hello World");

			expect(updated).toBe(entity);
			expect(updated.slug).toBe("hello-world");
			expect(updated.updatedAt).toBeUndefined();
		});

		it("should accumulate successive updates", () => {
			const updater = new EntityUpdater(makePost());

			updater.run("title", "second");
			const updated = updater.run("views", 2);

			expect(updated.title).toBe("second");
			expect(updated.views).toBe(2);
		});

		it("should throw InvalidDomainDataException when the value breaks the schema", () => {
			const updater = new EntityUpdater(makePost());

			expect(() => updater.run("views", -5)).toThrow(
				InvalidDomainDataException,
			);
			expect(updater.current.views).toBe(1);
		});

		it("should throw InvalidPropertyException when a value-object rejects the value", () => {
			const updater = new EntityUpdater(makePost());

			expect(() => updater.run("title", "")).toThrow(InvalidPropertyException);
			expect(updater.current.title).toBe("original");
		});

		it("should throw OperationFailedException when the factory drops the entity identity", () => {
			const updater = new EntityUpdater(makeIdentityDroppingPost());

			expect(() => updater.run("views", 2)).toThrow(OperationFailedException);
		});

		it("should reject base entity props at runtime", () => {
			const updater = new EntityUpdater(makePost());

			expect(() => updater.run("id" as never, "other" as never)).toThrow(
				InvalidPropertyException,
			);
			expect(() =>
				updater.run("updatedAt" as never, "2026-01-01" as never),
			).toThrow(InvalidPropertyException);
		});
	});

	describe("current", () => {
		it("should expose the original instance before any update", () => {
			const entity = makePost();
			const updater = new EntityUpdater(entity);

			expect(updater.current).toBe(entity);
		});

		it("should reflect the latest rebuilt instance after updates", () => {
			const entity = makePost();
			const updater = new EntityUpdater(entity);

			const updated = updater.run("title", "changed");

			expect(updater.current).toBe(updated);
			expect(updater.current).not.toBe(entity);
		});
	});
});
