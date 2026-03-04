import type { IEntity } from "./types";
import { EntitySource, EntitySchema, EntityContext } from "./symbols";
import type { Schema } from "@roastery/terroir/schema";
import { DateTimeVO, UuidVO } from "@/collections/value-objects";
import type { EntityDTO } from "./dtos";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { t } from "@roastery/terroir";

export abstract class Entity<SchemaType extends t.TSchema>
	implements IEntity<SchemaType>
{
	public abstract readonly [EntitySource]: string;
	public abstract readonly [EntitySchema]: Schema<SchemaType>;

	private _id: UuidVO;
	private _createdAt: DateTimeVO;
	private _updatedAt?: DateTimeVO;

	public get id(): string {
		return this._id.value;
	}

	public get createdAt(): string {
		return this._createdAt.value;
	}

	public get updatedAt(): string | undefined {
		return this._updatedAt?.value;
	}

	protected constructor({ createdAt, id, updatedAt }: EntityDTO) {
		this._id = UuidVO.make(id, this[EntityContext]("id"));
		this._createdAt = DateTimeVO.make(
			createdAt,
			this[EntityContext]("createdAt"),
		);
		this._updatedAt = updatedAt
			? DateTimeVO.make(updatedAt, this[EntityContext]("updatedAt"))
			: undefined;
	}

	protected update(): void {
		this._updatedAt = DateTimeVO.now(this[EntityContext]("updatedAt"));
	}

	public [EntityContext](name: string): IValueObjectMetadata {
		return {
			name,
			source: this[EntitySource],
		};
	}
}
