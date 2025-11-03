"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/");
    }
  };

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
            <Button variant="ghost" size="sm" className="rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
              Archive
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="rounded-full bg-white/10 text-white hover:bg-white/20">
              Settings
            </Button>
          </Link>
        </nav>

        <Button size="sm" className="rounded-full bg-white text-black hover:bg-gray-200">
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <h2 className="mb-8 text-3xl font-semibold">Settings</h2>

        <div className="space-y-6">
          <Card className="border-gray-800 bg-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="text-white">Account Information</CardTitle>
              <CardDescription className="text-gray-400">
                Your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Name</p>
                <p className="text-white">{session.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{session.user.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="text-white">Session</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your account session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}