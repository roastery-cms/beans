import type { t } from "@roastery/terroir";
import { ParseEntityToDTOService } from "../entity/services";
import { EntitySchema, EntitySource } from "../entity/symbols";
import type { IEntity, IRawEntity } from "../entity/types";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";

export const Mapper = {
	toDTO: <SchemaType extends t.TSchema>(
		data: IEntity<SchemaType>,
	): t.Static<SchemaType> => {
		const entityMapped = ParseEntityToDTOService.run<
			SchemaType,
			IEntity<SchemaType>
		>(data);

		if (!data[EntitySchema].match(entityMapped))
			throw new InvalidDomainDataException(data[EntitySource]);

		return entityMapped;
	},
	toDomain: <SchemaType extends t.TSchema>(
		dto: t.Static<SchemaType>,
		factory: (
			data: Omit<t.Static<SchemaType>, keyof IRawEntity>,
			entityProps: IRawEntity,
		) => IEntity<SchemaType>,
	): IEntity<SchemaType> => {
		const { id, createdAt, updatedAt, ...content } = dto as IRawEntity &
			Record<string, unknown>;
		return factory(content as Omit<t.Static<SchemaType>, keyof IRawEntity>, {
			id,
			createdAt,
			updatedAt,
		});
	},
} as const;
