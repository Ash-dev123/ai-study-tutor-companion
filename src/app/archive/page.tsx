"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function ArchivePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gray-500/10 blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">StudySphere</h1>
        </div>

        <nav className="flex items-center gap-2">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
              Chat
            </Button>
          </Link>
          <Link href="/archive">
            <Button variant="ghost" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20">
              Archive
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
              Settings
            </Button>
          </Link>
        </nav>

        <Button size="sm" className="rounded-full bg-white text-black hover:bg-gray-200">
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-semibold">Archive</h2>
          <p className="text-gray-400">Your archived conversations will appear here.</p>
        </div>
      </main>
    </div>
  );
}