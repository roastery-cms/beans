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
	toDomain: <
		SchemaType extends t.TSchema,
		Input = Omit<t.Static<SchemaType>, keyof IRawEntity>,
	>(
		dto: Input & IRawEntity,
		factory: (data: Input, entityProps: IRawEntity) => IEntity<SchemaType>,
	): IEntity<SchemaType> => {
		const { id, createdAt, updatedAt, ...content } = dto;
		return factory(content as Input, {
			id,
			createdAt,
			updatedAt,
		});
	},
} as const;
