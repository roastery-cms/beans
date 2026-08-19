import {
    BooleanVO,
    SlugVO,
    StringVO,
} from "@/domain/collections/value-objects";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { onCreate, onUpdate } from "@/domain/entity/decorators";
import { inMemoryRepositoryOf } from "@/testing";
import { uniqueKeysOf } from "@/domain/entity/helpers";
import { blueprint, defineDomainEvent, defineUseCase, entityOf } from "@/way";

const postTagProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    hidden: BooleanVO,
}).with({ slug: { derive: (ctx) => ctx.name }, hidden: { default: false } });

const CreatePostTagEvent = defineDomainEvent("create-post-tag");
const UpdatePostTagEvent = defineDomainEvent("update-post-tag");

@onCreate(CreatePostTagEvent)
@onUpdate(UpdatePostTagEvent)
export class PostTag extends entityOf(postTagProperties, "post-tag", {
	unique: ["slug"],
}) {
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

const PostTagRepository = inMemoryRepositoryOf(
    PostTag,
    {
        read: ["findMany", "findById", "findBySlug", "count"],
        write: ["create", "delete", "update"],
    },
    (ctx) => {
        return {
            async findAll() {
                return await ctx.findMany({
                    page: 1,
                    perPage: await ctx.count(),
                });
            },
        };
    },
);
type PostTagRepository = typeof PostTagRepository;

// Seria bom se tivesse um método que pegasse um shape já existente e conseguisse alterar a assinatura já atribuída a ele: Omitir chave/valor; Trocar tipos de campo;

// const createPostTagProperties = blueprint({ name: StringVO }).done();

// type CreatePostTagDependencies = {
//     postTagRepository: PostTagRepository;
// };

// class CreatePostTag extends defineUseCase<
//     typeof createPostTagProperties,
//     CreatePostTagDependencies,
//     PostTag
// >(createPostTagProperties, "create-post-tag") {
//     public override async handle(
//         deps: CreatePostTagDependencies,
//     ): Promise<PostTag> {
//         return new PostTag({ name: this.name });
//     }
// }
