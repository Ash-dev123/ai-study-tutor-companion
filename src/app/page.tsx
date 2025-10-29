"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Brain,
  CheckCircle,
  Lightbulb,
  BookOpen,
  Upload,
  Zap,
  Clock,
  ArrowRight,
  LogOut,
  User
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCustomer } from "autumn-js/react";

export default function Home() {
  const { data: session, isPending, refetch } = useSession();
  const { customer, isLoading: customerLoading } = useCustomer();
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email submitted:", email);
    // Handle email submission
  };

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      toast.success("Signed out successfully");
    }
  };

  const userName = session?.user?.name?.split(" ")[0] || "there";
  const currentPlan = customer?.products?.at(-1);
  const planName = currentPlan?.name || "Free Plan";

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">StudySphere</h1>
            </Link>
            {session?.user && (
              <div className="hidden md:flex items-center gap-4">
                <Link href="/chat">
                  <Button variant="ghost" size="sm">
                    Chat
                  </Button>
                </Link>
                <Link href="/archive">
                  <Button variant="ghost" size="sm">
                    Archive
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost" size="sm">
                    Pricing
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" size="sm">
                    Settings
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPending || customerLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : session?.user ? (
              <>
                {/* Plan Badge */}
                <Link href="/pricing">
                  <Badge variant="secondary" className="px-2 py-1 text-xs font-medium cursor-pointer hover:bg-primary/20">
                    {planName}
                  </Badge>
                </Link>
                <Link href="/chat">
                  <Button size="sm">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Go to Chat
                  </Button>
                </Link>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full"
                  title={session.user.name || "User"}
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSignOut}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative mx-auto px-4 py-20 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            {session?.user && (
              <Badge className="mb-4" variant="secondary">
                Welcome back, {userName}!
              </Badge>
            )}
            {!session?.user && (
              <Badge className="mb-4" variant="secondary">
                AI-Powered Learning
              </Badge>
            )}
            <h1 className="mb-6 text-5xl font-bold tracking-tight lg:text-7xl lg:!text-black">
              {session?.user ? `Ready to Learn, ${userName}?` : "Learn Smarter with"}
              <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text !text-black">
                {session?.user ? "Let's continue your journey" : "Socratic AI Tutoring"}
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground lg:text-xl">
              {session?.user
                ? "Your personal AI study tutor is ready to help you master any subject with the Socratic method."
                : "Your personal AI-powered study companion that uses the Socratic method to help you truly understand concepts, not just memorize them."}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              {session?.user ? (
                <>
                  <Link href="/chat">
                    <Button size="lg" className="text-lg">
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Start Chatting
                    </Button>
                  </Link>
                  <Link href="/archive">
                    <Button size="lg" variant="outline" className="text-lg">
                      View Archive
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="text-lg">
                      Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="text-lg">
                    Watch Demo
                  </Button>
                </>
              )}
            </div>
            {!session?.user && (
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required • Free trial available
              </p>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-b py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold lg:text-5xl">How It Works</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Our AI tutor uses proven teaching methods to help you truly understand concepts, 
              not just memorize answers.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 transition-all hover:border-primary">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Socratic Questioning</h3>
                <p className="text-muted-foreground">
                  Instead of giving direct answers, we ask guiding questions that help you 
                  discover solutions yourself, building deeper understanding.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 transition-all hover:border-primary">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Problem-Solving Guidance</h3>
                <p className="text-muted-foreground">
                  We walk you through problems step-by-step, ensuring you understand each 
                  concept before moving forward.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 transition-all hover:border-primary">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Gentle Error Correction</h3>
                <p className="text-muted-foreground">
                  Learn from mistakes with kind, constructive feedback that explains why 
                  something is wrong and how to fix it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 transition-all hover:border-primary">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Adaptive Learning</h3>
                <p className="text-muted-foreground">
                  Remembers your progress and adapts to your learning style, pace, and 
                  areas that need reinforcement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold lg:text-5xl">Powerful Features</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Everything you need to excel in your studies, from flashcards to last-minute exam prep.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <BookOpen className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-2xl font-semibold">Interactive Flashcards</h3>
                <p className="mb-4 text-muted-foreground">
                  AI-generated flashcards from any topic. Test yourself one at a time with 
                  immediate feedback and progress tracking.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Customizable difficulty levels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Spaced repetition algorithm</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Review missed questions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <Upload className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-2xl font-semibold">Quiz from Your Materials</h3>
                <p className="mb-4 text-muted-foreground">
                  Upload PDFs, notes, or even handwritten content. Get targeted quizzes based 
                  on your actual study materials.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>PDF and image support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Handwritten notes recognition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Multiple choice or open-ended</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <Clock className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-2xl font-semibold">Last-Minute Exam Prep</h3>
                <p className="mb-4 text-muted-foreground">
                  Exam in 20 minutes? Get a rapid review of the most important concepts with 
                  high-yield topic prioritization.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Prioritized concept review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Fast-paced learning mode</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Critical topics first</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <Brain className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-2xl font-semibold">Cross-Session Memory</h3>
                <p className="mb-4 text-muted-foreground">
                  Your tutor remembers what you've learned and struggled with, creating 
                  personalized learning paths across all sessions.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Tracks knowledge gaps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Circles back to weak areas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Works across devices</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <Zap className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-2xl font-semibold">Interview Preparation</h3>
                <p className="mb-4 text-muted-foreground">
                  Practice coding challenges and behavioral questions. Get real-time feedback 
                  and edge case testing.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Algorithm problem solving</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>STAR format coaching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Mock interview scenarios</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="pt-6">
                <MessageCircle className="mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-3 text-2xl font-semibold">Multi-Subject Support</h3>
                <p className="mb-4 text-muted-foreground">
                  From Python programming to Italian grammar, math to cybersecurity—master 
                  any subject with adaptive teaching.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>STEM and humanities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Language learning support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>Subject-specific analogies</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Example Interactions Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold lg:text-5xl">See It In Action</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Real examples of how our AI tutor guides students through different subjects.
            </p>
          </div>

          <div className="space-y-8">
            {/* Python Example */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 px-6 py-4">
                  <h3 className="text-xl font-semibold">Python Programming</h3>
                  <p className="text-sm text-muted-foreground">Learning fundamentals through discovery</p>
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="text-sm font-semibold">S</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="mt-1">"Teach me how to program in Python"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">AI Tutor</p>
                      <p className="mt-1">"Have you programmed before? Let's start with print(). What do you think it does?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="text-sm font-semibold">S</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="mt-1">"It probably prints things to the screen?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">AI Tutor</p>
                      <p className="mt-1">"Good! Now try writing print('Hello') yourself and tell me what happens."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Math Example */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 px-6 py-4">
                  <h3 className="text-xl font-semibold">Algebra Problem Solving</h3>
                  <p className="text-sm text-muted-foreground">Guided reasoning with patience</p>
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="text-sm font-semibold">S</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="mt-1">"Solve: 5C + 2M = 3C + 4M. Do I subtract 10 from both sides?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">AI Tutor</p>
                      <p className="mt-1">"Let's think about this. We need to subtract a multiple of C or M. What would help isolate one variable?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="text-sm font-semibold">S</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="mt-1">"Oh, subtract 3C from both sides!"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">AI Tutor</p>
                      <p className="mt-1">"Perfect! Now what do we have? Walk me through the simplification."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Example */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 px-6 py-4">
                  <h3 className="text-xl font-semibold">Italian Language Learning</h3>
                  <p className="text-sm text-muted-foreground">Gentle correction and practice</p>
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="text-sm font-semibold">S</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="mt-1">"Mi chiamo François. Sono de Francia"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">AI Tutor</p>
                      <p className="mt-1">"Great start! Small correction: it's 'di Francia' not 'de Francia'. The preposition 'di' means 'from' in Italian. Try saying it again?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">
                      <span className="text-sm font-semibold">S</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="mt-1">"Sono di Francia"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">AI Tutor</p>
                      <p className="mt-1">"Perfect! Now let's practice more sentences about where you're from..."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-4xl font-bold lg:text-5xl">
              {session?.user ? `Keep Learning, ${userName}!` : "Ready to Transform Your Learning?"}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              {session?.user
                ? "Jump back into your studies and continue mastering new concepts."
                : "Join thousands of students who are learning smarter, not harder."}
            </p>
            {session?.user ? (
              <Link href="/chat">
                <Button size="lg" className="text-lg">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Continue Learning
                </Button>
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" size="lg">
                  Get Started
                </Button>
              </form>
            )}
            {!session?.user && (
              <p className="mt-4 text-sm text-muted-foreground">
                Start your free trial today. No credit card required.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <h3 className="mb-4 text-2xl font-bold">StudySphere</h3>
              <p className="mb-4 text-muted-foreground">
                Your personal AI-powered study companion that uses the Socratic method to help 
                you truly understand concepts, not just memorize them.
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="icon">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </Button>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 StudySphere. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}