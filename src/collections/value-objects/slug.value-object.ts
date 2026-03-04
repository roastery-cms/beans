import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import { slugify } from "@/entity/helpers";
import type { SlugDTO } from "../dtos";
import { SlugSchema } from "../schemas";

export class SlugVO extends ValueObject<string, typeof SlugDTO> {
	protected override schema: Schema<typeof SlugDTO> = SlugSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(value: string, info: IValueObjectMetadata): SlugVO {
		const newVO = new SlugVO(slugify(value), info);

		newVO.validate();

		return newVO;
	}
}
