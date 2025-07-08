import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { NotionApp } from "./NotionApp";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Authenticated>
        <NotionApp />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
            <h2 className="text-xl font-semibold text-primary">NotionClone</h2>
          </header>
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-primary mb-4">Welcome to NotionClone</h1>
                <p className="text-xl text-secondary">Sign in to start creating and sharing notes</p>
              </div>
              <SignInForm />
            </div>
          </main>
        </div>
      </Unauthenticated>
      <Toaster />
    </div>
  );
}
