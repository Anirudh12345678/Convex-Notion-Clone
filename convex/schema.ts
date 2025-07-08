import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  notes: defineTable({
    title: v.string(),
    content: v.string(),
    isPublic: v.boolean(),
    authorId: v.id("users"),
    lastEditedBy: v.optional(v.id("users")),
    lastEditedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_public", ["isPublic"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["isPublic", "authorId"],
    }),
  
  noteShares: defineTable({
    noteId: v.id("notes"),
    sharedWithId: v.id("users"),
    permission: v.union(v.literal("read"), v.literal("write")),
    sharedBy: v.id("users"),
  })
    .index("by_note", ["noteId"])
    .index("by_user", ["sharedWithId"])
    .index("by_note_and_user", ["noteId", "sharedWithId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
