import { DateTimeSchema, StringSchema } from "@/domain/collections/schemas";
import {
    BooleanVO,
    SchemaVO,
    SlugVO,
    StringVO,
    UrlVO,
} from "@/domain/collections/value-objects";
import { customRecordVO } from "@/domain/collections/value-objects/custom";
import type { SetHandlersOf } from "@/domain/entity/types";
import { arrayOf, blueprint, entityOf, optionalOf } from "@/way";
import { t } from "@roastery/terroir";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { Source } from "@roastery/terroir/symbols";

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

const postTypeProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    shape: SchemaVO,
    isHighlighted: BooleanVO,
}).with({
    slug: { derive: (ctx) => ctx.name },
    isHighlighted: { default: false },
});

class PostType extends entityOf(postTypeProperties, "post-type") {
    rename(value: string): void {
        this.set("name", value);
    }

    reslug(value: string): void {
        this.set("slug", value);
    }

    setHighlightTo(value: boolean): void {
        this.set("isHighlighted", value);
    }
}

const postProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    description: StringVO,
    cover: UrlVO,
    type: optionalOf(PostType),
    tag: arrayOf(PostTag),
    content: StringVO,
    info: customRecordVO(),
}).with({ slug: { derive: (ctx) => ctx.name } });

class Post extends entityOf(postProperties, "post") {
    protected override onSet(): SetHandlersOf<typeof postProperties> {
        return {
            info: (value, raw) => {
                if (raw.type && !SchemaVO.match(raw.type.shape, value))
                    throw new InvalidPropertyException("info", this[Source]);
            },
        };
    }
}

const rockAndRoll = new PostTag({ name: "Rock n' Roll" });
const indieRock = new PostTag({ name: "Indie Rock" });
const noise = new PostTag({ name: "Noise" });

const musicReview = new PostType({
    name: "Music Review",
    shape: SchemaManager.serialize(
        t.Object({
            group: StringSchema,
            albumName: StringSchema,
            releasedAt: DateTimeSchema,
        }),
    ),
});

const firstReview = new Post({
    name: "Lupe de Lupe – Amor",
    content: "Testing",
    cover: "https://google.com",
    description: "Testing Description",
    info: {
        group: "Lupe de Lupe",
        albumName: "Amor",
        releasedAt: new Date(2025).toISOString(),
    },
    tag: [noise.toJSON(), indieRock.toJSON()],
    type: musicReview.toJSON(),
});

console.log(firstReview)
