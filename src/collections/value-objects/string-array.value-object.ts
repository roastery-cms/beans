import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { StringArrayDTO } from "../dtos";
import { StringArraySchema } from "../schemas";

export class StringArrayVO extends ValueObject<
	string[],
	typeof StringArrayDTO
> {
	protected override schema: Schema<typeof StringArrayDTO> = StringArraySchema;

	protected constructor(value: string[], info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(
		value: string[],
		info: IValueObjectMetadata,
	): StringArrayVO {
		const newVO = new StringArrayVO(value, info);

		newVO.validate();

		return newVO;
	}
}
