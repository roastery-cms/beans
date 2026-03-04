import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { BooleanDTO } from "../dtos";
import { BooleanSchema } from "../schemas";

export class BooleanVO extends ValueObject<boolean, typeof BooleanDTO> {
	protected override schema: Schema<typeof BooleanDTO> = BooleanSchema;

	protected constructor(value: boolean, info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(value: boolean, info: IValueObjectMetadata): BooleanVO {
		const newVO = new BooleanVO(value, info);

		newVO.validate();

		return newVO;
	}

	public static truthy(info: IValueObjectMetadata): BooleanVO {
		return BooleanVO.make(true, info);
	}

	public static falsy(info: IValueObjectMetadata): BooleanVO {
		return BooleanVO.make(false, info);
	}

	public static from(value: unknown, info: IValueObjectMetadata): BooleanVO {
		return BooleanVO.make(!!value, info);
	}
}
