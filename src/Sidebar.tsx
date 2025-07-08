import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

interface SidebarProps {
  userNotes: any[];
  sharedNotes: any[];
  publicNotes: any[];
  selectedNoteId: Id<"notes"> | null;
  onSelectNote: (noteId: Id<"notes">) => void;
  onCreateNote: () => void;
}

export function Sidebar({
  userNotes,
  sharedNotes,
  publicNotes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "shared" | "public" | "search">("my");
  
  const searchResults = useQuery(
    api.notes.searchNotes,
    searchQuery.trim() ? { query: searchQuery } : "skip"
  ) || [];

  const deleteNote = useMutation(api.notes.deleteNote);

  const handleDeleteNote = async (noteId: Id<"notes">, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteNote({ noteId });
        toast.success("Note deleted");
        if (selectedNoteId === noteId) {
          onSelectNote(userNotes[0]?._id || null);
        }
      } catch (error) {
        toast.error("Failed to delete note");
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const NoteItem = ({ note, showAuthor = false, canDelete = false }: any) => (
    <div
      key={note._id}
      onClick={() => onSelectNote(note._id)}
      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
        selectedNoteId === note._id
          ? "bg-blue-50 border border-blue-200"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {note.title || "Untitled"}
          </h3>
          {showAuthor && (
            <p className="text-xs text-gray-500 mt-1">by {note.authorName}</p>
          )}
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {note.content || "No content"}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {formatDate(note.lastEditedAt || note._creationTime)}
          </p>
        </div>
        {canDelete && (
          <button
            onClick={(e) => handleDeleteNote(note._id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onCreateNote}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + New Note
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) {
                setActiveTab("search");
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: "my", label: "My Notes", count: userNotes.length },
          { key: "shared", label: "Shared", count: sharedNotes.length },
          { key: "public", label: "Public", count: publicNotes.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activeTab === "search" && searchQuery.trim() ? (
          searchResults.length > 0 ? (
            searchResults.map((note) => (
              <NoteItem key={note._id} note={note} showAuthor />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No notes found for "{searchQuery}"</p>
            </div>
          )
        ) : activeTab === "my" ? (
          userNotes.length > 0 ? (
            userNotes.map((note) => (
              <NoteItem key={note._id} note={note} canDelete />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No notes yet</p>
              <p className="text-sm mt-1">Create your first note!</p>
            </div>
          )
        ) : activeTab === "shared" ? (
          sharedNotes.length > 0 ? (
            sharedNotes.map((note) => (
              <NoteItem key={note._id} note={note} showAuthor />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No shared notes</p>
            </div>
          )
        ) : (
          publicNotes.length > 0 ? (
            publicNotes.map((note) => (
              <NoteItem key={note._id} note={note} showAuthor />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No public notes</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
