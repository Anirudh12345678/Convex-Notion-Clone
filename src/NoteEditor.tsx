import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface NoteEditorProps {
  noteId: Id<"notes">;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useQuery(api.notes.getNote, { noteId });
  const updateNote = useMutation(api.notes.updateNote);
  const shareNote = useMutation(api.notes.shareNote);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"read" | "write">(
    "read",
  );
  const [isSaving, setIsSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setIsPublic(note.isPublic);
    }
  }, [note]);

  // Auto-save functionality
  const saveNote = async (
    newTitle?: string,
    newContent?: string,
    newIsPublic?: boolean,
  ) => {
    if (!note?.canEdit) return;

    setIsSaving(true);
    try {
      await updateNote({
        noteId,
        title: newTitle !== undefined ? newTitle : title,
        content: newContent !== undefined ? newContent : content,
        isPublic: newIsPublic !== undefined ? newIsPublic : isPublic,
      });
    } catch (error) {
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const debouncedSave = (
    newTitle?: string,
    newContent?: string,
    newIsPublic?: boolean,
  ) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newTitle, newContent, newIsPublic);
    }, 1000);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (note?.canEdit) {
      debouncedSave(newTitle, undefined, undefined);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (note?.canEdit) {
      debouncedSave(undefined, newContent, undefined);
    }
  };

  const handleVisibilityChange = (newIsPublic: boolean) => {
    setIsPublic(newIsPublic);
    if (note?.canEdit) {
      saveNote(undefined, undefined, newIsPublic);
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      await shareNote({
        noteId,
        email: shareEmail.trim(),
        permission: sharePermission,
      });
      toast.success("Note shared successfully");
      setShowShareModal(false);
      setShareEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to share note");
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}?note=${noteId}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied to clipboard");
  };

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Visibility:</span>
            <select
              value={isPublic ? "public" : "private"}
              onChange={(e) =>
                handleVisibilityChange(e.target.value === "public")
              }
              disabled={!note.canEdit}
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="public">🌍 Public</option>
              <option value="private">🔒 Private</option>
            </select>
          </div>

          {isPublic && (
            <button
              onClick={copyPublicLink}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              📋 Copy Link
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </span>
          )}

          {note.canEdit && (
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Share
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            disabled={!note.canEdit}
            className="w-full text-4xl font-bold border-none outline-none placeholder-gray-300 mb-4 disabled:bg-transparent"
          />

          {/* Metadata */}
          <div className="text-sm text-gray-500 mb-6 flex items-center gap-4">
            <span>By {note.authorName}</span>
            <span>•</span>
            <span>
              Last edited{" "}
              {new Date(
                note.lastEditedAt || note._creationTime,
              ).toLocaleDateString()}
            </span>
            {!note.canEdit && (
              <>
                <span>•</span>
                <span className="text-amber-600">👁️ Read-only</span>
              </>
            )}
          </div>

          {/* Content */}
          <textarea
            ref={contentRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing..."
            disabled={!note.canEdit}
            className="w-full p-4 rounded-lg min-h-96 text-lg leading-relaxed border-none outline-none resize-none placeholder-gray-300 disabled:bg-transparent"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Share Note</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permission
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) =>
                    setSharePermission(e.target.value as "read" | "write")
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read">Can view</option>
                  <option value="write">Can edit</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-red-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
