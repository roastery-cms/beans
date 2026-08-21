import {
    BooleanVO,
    SlugVO,
    StringVO,
} from "@/domain/collections/value-objects";
import { OptionalStringVO } from "@/domain/collections/value-objects/optional";
import { blueprint, entityOf, recordOf } from "@/way";

const postTagProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    hidden: BooleanVO,
}).with({ hidden: { default: false }, slug: { derive: (ctx) => ctx.name } });

class PostTag extends entityOf(postTagProperties, "post-tag", {
    unique: ["slug"],
}) {
    rename(value: string): void {
        this.set("name", value);
    }

    reslug(value: string): void {
        this.set("slug", value);
    }

    changeVisibility(value: boolean): void {
        this.set("hidden", value);
    }
}

const addressProperties = blueprint({
    street: StringVO,
    neighbourhood: StringVO,
    country: StringVO,
    state: StringVO,
    city: StringVO,
    number: StringVO,
    additionalInfo: OptionalStringVO,
}).done();

class Address extends recordOf(addressProperties, "address") {
    changeCity(value: string): void {
        this.set("city", value);
    }
}

console.log(new Address({
    city: "",
    country: "",
    neighbourhood: "",
    number: "",
    state: "a",
    street: "",
}).toJSON());
