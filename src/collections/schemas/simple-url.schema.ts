import { t } from "@roastery/terroir";
import type { ToDTO } from "@roastery/terroir/schema/types";

/**
 * TypeBox schema for any-protocol URI strings (e.g. `redis://`, `mongodb://`,
 * `s3://`) — the looser sibling of {@link UrlSchema}, which restricts to HTTP/HTTPS.
 *
 * Validation is delegated to the `"simple-url"` format registered in
 * `@roastery/terroir/schema/formats`. Use this schema for connection strings and
 * non-browser URIs; reach for {@link UrlSchema} when you need a URL safe to embed
 * in a web page.
 *
 * @see {@link UrlSchema} — HTTP/HTTPS-only counterpart.
 */
export const SimpleUrlSchema = t.String({
	description:
		"A URI of any protocol (HTTP, Redis, Mongo, etc.). Use UrlSchema for HTTP/HTTPS-only.",
	examples: ["redis://localhost:6739"],
	format: "simple-url",
});

/** Static type of {@link SimpleUrlSchema} — equivalent to `string`. */
export type SimpleUrlSchema = ToDTO<typeof SimpleUrlSchema>;
