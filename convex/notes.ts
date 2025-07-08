import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get current user's notes
export const getUserNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .collect();

    return notes;
  },
});

// Get notes shared with current user
export const getSharedNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const shares = await ctx.db
      .query("noteShares")
      .withIndex("by_user", (q) => q.eq("sharedWithId", userId))
      .collect();

    const notes = await Promise.all(
      shares.map(async (share) => {
        const note = await ctx.db.get(share.noteId);
        if (!note) return null;
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          authorName: author?.name || author?.email || "Unknown",
          permission: share.permission,
        };
      })
    );

    return notes.filter(Boolean);
  },
});

// Get public notes
export const getPublicNotes = query({
  args: {},
  handler: async (ctx) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(20);

    const notesWithAuthors = await Promise.all(
      notes.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          authorName: author?.name || author?.email || "Anonymous",
        };
      })
    );

    return notesWithAuthors;
  },
});

// Get a specific note
export const getNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const note = await ctx.db.get(args.noteId);
    
    if (!note) return null;

    // Check if user can access this note
    if (note.isPublic) {
      const author = await ctx.db.get(note.authorId);
      return {
        ...note,
        authorName: author?.name || author?.email || "Anonymous",
        canEdit: userId === note.authorId,
      };
    }

    if (!userId) return null;

    // Check if user owns the note
    if (note.authorId === userId) {
      return {
        ...note,
        authorName: "You",
        canEdit: true,
      };
    }

    // Check if note is shared with user
    const share = await ctx.db
      .query("noteShares")
      .withIndex("by_note_and_user", (q) => 
        q.eq("noteId", args.noteId).eq("sharedWithId", userId)
      )
      .unique();

    if (share) {
      const author = await ctx.db.get(note.authorId);
      return {
        ...note,
        authorName: author?.name || author?.email || "Unknown",
        canEdit: share.permission === "write",
      };
    }

    return null;
  },
});

// Create a new note
export const createNote = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const noteId = await ctx.db.insert("notes", {
      title: args.title,
      content: args.content || "",
      isPublic: args.isPublic ?? true, // Default to public
      authorId: userId,
      lastEditedAt: Date.now(),
    });

    return noteId;
  },
});

// Update a note
export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    // Check if user can edit this note
    let canEdit = note.authorId === userId;
    
    if (!canEdit) {
      const share = await ctx.db
        .query("noteShares")
        .withIndex("by_note_and_user", (q) => 
          q.eq("noteId", args.noteId).eq("sharedWithId", userId)
        )
        .unique();
      
      canEdit = share?.permission === "write";
    }

    if (!canEdit) throw new Error("Not authorized to edit this note");

    const updates: any = {
      lastEditedBy: userId,
      lastEditedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.isPublic !== undefined && note.authorId === userId) {
      updates.isPublic = args.isPublic;
    }

    await ctx.db.patch(args.noteId, updates);
  },
});

// Delete a note
export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    if (note.authorId !== userId) {
      throw new Error("Not authorized to delete this note");
    }

    // Delete all shares for this note
    const shares = await ctx.db
      .query("noteShares")
      .withIndex("by_note", (q) => q.eq("noteId", args.noteId))
      .collect();

    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    await ctx.db.delete(args.noteId);
  },
});

// Share a note with another user
export const shareNote = mutation({
  args: {
    noteId: v.id("notes"),
    email: v.string(),
    permission: v.union(v.literal("read"), v.literal("write")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    if (note.authorId !== userId) {
      throw new Error("Not authorized to share this note");
    }

    // Find user by email
    const userToShareWith = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();

    if (!userToShareWith) {
      throw new Error("User not found");
    }

    if (userToShareWith._id === userId) {
      throw new Error("Cannot share note with yourself");
    }

    // Check if already shared
    const existingShare = await ctx.db
      .query("noteShares")
      .withIndex("by_note_and_user", (q) => 
        q.eq("noteId", args.noteId).eq("sharedWithId", userToShareWith._id)
      )
      .unique();

    if (existingShare) {
      // Update existing share
      await ctx.db.patch(existingShare._id, {
        permission: args.permission,
      });
    } else {
      // Create new share
      await ctx.db.insert("noteShares", {
        noteId: args.noteId,
        sharedWithId: userToShareWith._id,
        permission: args.permission,
        sharedBy: userId,
      });
    }
  },
});

// Search notes
export const searchNotes = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    if (!args.query.trim()) return [];

    // Search public notes
    const publicResults = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("isPublic", true)
      )
      .take(10);

    if (!userId) {
      const resultsWithAuthors = await Promise.all(
        publicResults.map(async (note) => {
          const author = await ctx.db.get(note.authorId);
          return {
            ...note,
            authorName: author?.name || author?.email || "Anonymous",
          };
        })
      );
      return resultsWithAuthors;
    }

    // Search user's own notes
    const userResults = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("authorId", userId)
      )
      .take(10);

    // Combine and deduplicate results
    const allResults = [...publicResults, ...userResults];
    const uniqueResults = allResults.filter((note, index, self) => 
      index === self.findIndex(n => n._id === note._id)
    );

    const resultsWithAuthors = await Promise.all(
      uniqueResults.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          authorName: note.authorId === userId ? "You" : (author?.name || author?.email || "Anonymous"),
        };
      })
    );

    return resultsWithAuthors.slice(0, 10);
  },
});
