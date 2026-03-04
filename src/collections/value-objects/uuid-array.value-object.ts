import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { UuidArrayDTO } from "../dtos";
import { UuidArraySchema } from "../schemas";

export class UuidArrayVO extends ValueObject<string[], typeof UuidArrayDTO> {
	protected override schema: Schema<typeof UuidArrayDTO> = UuidArraySchema;

	protected constructor(value: string[], info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(value: string[], info: IValueObjectMetadata): UuidArrayVO {
		const newVO = new UuidArrayVO(value, info);

		newVO.validate();

		return newVO;
	}
}
