import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { SignOutButton } from "./SignOutButton";
import { NoteEditor } from "./NoteEditor";
import { Sidebar } from "./Sidebar";
import { toast } from "sonner";

export function NotionApp() {
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const userNotes = useQuery(api.notes.getUserNotes) || [];
  const sharedNotes = useQuery(api.notes.getSharedNotes) || [];
  const publicNotes = useQuery(api.notes.getPublicNotes) || [];
  const createNote = useMutation(api.notes.createNote);

  // Auto-select first note if none selected
  useEffect(() => {
    if (!selectedNoteId && userNotes.length > 0) {
      setSelectedNoteId(userNotes[0]._id);
    }
  }, [userNotes, selectedNoteId]);

  const handleCreateNote = async () => {
    try {
      const noteId = await createNote({
        title: "Untitled",
        content: "",
        isPublic: true,
      });
      setSelectedNoteId(noteId);
      toast.success("New note created");
    } catch (error) {
      toast.error("Failed to create note");
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-200 overflow-hidden border-r border-gray-200 bg-white`}>
        <Sidebar
          userNotes={userNotes}
          sharedNotes={sharedNotes}
          publicNotes={publicNotes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">NotionClone</h1>
          </div>
          <SignOutButton />
        </header>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {selectedNoteId ? (
            <NoteEditor noteId={selectedNoteId} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg mb-2">No note selected</p>
                <p className="text-sm">Select a note from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
