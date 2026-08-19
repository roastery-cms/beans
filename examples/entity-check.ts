import { blueprint, entityOf } from "@/way";
import {
    BooleanVO,
    SlugVO,
    StringVO,
} from "@/way/collections/value-objects";
import { entityHas } from "@/domain/entity/helpers";

const postTagProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    hidden: BooleanVO,
}).with({
    hidden: { default: true },
    slug: { derive: (ctx) => ctx.name },
});

class PostTag extends entityOf(postTagProperties, "post-tag") {
    rename(value: string) {
        this.set("name", value);
    }

    reslug(value: string) {
        this.set("slug", value);
    }

    changeVisibility(value: boolean) {
        this.set("hidden", value);
    }
}

// new PostTag({ name: "Testing" })

console.log(entityHas(PostTag, { slug: StringVO }));
