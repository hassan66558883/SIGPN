import type { z } from "zod";
import type { aliasSchema, identifierSchema, personSchema, relationshipSchema } from "@/server/persons/schemas";

export type PersonInput = z.infer<typeof personSchema>;
export type IdentifierInput = z.infer<typeof identifierSchema>;
export type AliasInput = z.infer<typeof aliasSchema>;
export type RelationshipInput = z.infer<typeof relationshipSchema>;
