"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TypingAnimation } from "@/components/typing-animation";
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
  User,
  Sparkles,
  GraduationCap,
  Target
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
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <GraduationCap className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
                <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-primary/60" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">StudySphere</h1>
            </Link>
            {session?.user && (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className="hover:bg-primary/5">
                    Chat
                  </Button>
                </Link>
                <Link href="/archive">
                  <Button variant="ghost" size="sm" className="hover:bg-primary/5">
                    Archive
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="ghost" size="sm" className="hover:bg-primary/5">
                    Pricing
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" size="sm" className="hover:bg-primary/5">
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
                <Link href="/pricing">
                  <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                    {planName}
                  </Badge>
                </Link>
                <Link href="/chat">
                  <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Go to Chat
                  </Button>
                </Link>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full hover:bg-primary/5 transition-colors"
                  title={session.user.name || "User"}
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="hover:bg-primary/5">
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow">
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
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.05),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.03),transparent_50%)]" />
        
        <div className="container relative mx-auto px-4 py-24 lg:py-40">
          <div className="mx-auto max-w-5xl text-center">
            {session?.user ? (
              <Badge className="mb-6 shadow-lg" variant="secondary">
                <Sparkles className="mr-1.5 h-3 w-3" />
                Welcome back, {userName}!
              </Badge>
            ) : (
              <Badge className="mb-6 shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-700" variant="secondary">
                <Sparkles className="mr-1.5 h-3 w-3" />
                AI-Powered Learning Revolution
              </Badge>
            )}
            
            <h1 className="mb-8 text-6xl font-extrabold tracking-tight lg:text-8xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {session?.user ? (
                <>
                  <TypingAnimation 
                    text="Ready to Learn," 
                    speed={40}
                    delay={500}
                  />
                  <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    <TypingAnimation 
                      text={`${userName}?`} 
                      speed={10}
                      delay={500}
                    />
                  </span>
                </>
              ) : (
                <>
                  <TypingAnimation 
                    text="Learn Smarter with" 
                    speed={10}
                    delay={100}
                  />
                  <span className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    <TypingAnimation 
                      text="Socratic AI Tutoring" 
                      speed={10}
                      delay={200}
                    />
                  </span>
                </>
              )}
            </h1>
            
            <p className="mx-auto mb-10 max-w-3xl text-xl text-muted-foreground lg:text-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-150">
              {session?.user
                ? "Your personal AI study tutor is ready to help you master any subject with the Socratic method."
                : "Your personal AI-powered study companion that guides you to truly understand concepts through interactive questioning, not just memorization."}
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              {session?.user ? (
                <>
                  <Link href="/chat">
                    <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Start Chatting
                    </Button>
                  </Link>
                  <Link href="/archive">
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                      View Archive
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                      Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    Watch Demo
                  </Button>
                </>
              )}
            </div>
            
            {!session?.user && (
              <p className="mt-6 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
                ✨ No credit card required • Free trial available • Join 10,000+ learners
              </p>
            )}
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        
        <div className="container relative mx-auto px-4">
          <div className="mb-20 text-center">
            <Badge className="mb-4" variant="outline">
              <Target className="mr-1.5 h-3 w-3" />
              Our Methodology
            </Badge>
            <h2 className="mb-6 text-5xl font-bold lg:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground leading-relaxed">
              Our AI tutor uses proven teaching methods to help you truly understand concepts, 
              not just memorize answers.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="group relative border-2 transition-all duration-300 hover:border-primary hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <CardContent className="relative pt-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Socratic Questioning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Instead of giving direct answers, we ask guiding questions that help you 
                  discover solutions yourself, building deeper understanding.
                </p>
              </CardContent>
            </Card>

            <Card className="group relative border-2 transition-all duration-300 hover:border-primary hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <CardContent className="relative pt-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform">
                  <Lightbulb className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Problem-Solving Guidance</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We walk you through problems step-by-step, ensuring you understand each 
                  concept before moving forward.
                </p>
              </CardContent>
            </Card>

            <Card className="group relative border-2 transition-all duration-300 hover:border-primary hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <CardContent className="relative pt-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Gentle Error Correction</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Learn from mistakes with kind, constructive feedback that explains why 
                  something is wrong and how to fix it.
                </p>
              </CardContent>
            </Card>

            <Card className="group relative border-2 transition-all duration-300 hover:border-primary hover:shadow-2xl hover:-translate-y-2 bg-gradient-to-br from-card to-card/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <CardContent className="relative pt-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">Adaptive Learning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Remembers your progress and adapts to your learning style, pace, and 
                  areas that need reinforcement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative border-y py-24 lg:py-40 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-20 text-center">
            <Badge className="mb-4" variant="outline">
              <Zap className="mr-1.5 h-3 w-3" />
              Powerful Tools
            </Badge>
            <h2 className="mb-6 text-5xl font-bold lg:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground leading-relaxed">
              Everything you need to excel in your studies, from flashcards to last-minute exam prep.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: "Interactive Flashcards",
                description: "AI-generated flashcards from any topic. Test yourself one at a time with immediate feedback and progress tracking.",
                features: ["Customizable difficulty levels", "Spaced repetition algorithm", "Review missed questions"]
              },
              {
                icon: Upload,
                title: "Quiz from Your Materials",
                description: "Upload PDFs, notes, or even handwritten content. Get targeted quizzes based on your actual study materials.",
                features: ["PDF and image support", "Handwritten notes recognition", "Multiple choice or open-ended"]
              },
              {
                icon: Clock,
                title: "Last-Minute Exam Prep",
                description: "Exam in 20 minutes? Get a rapid review of the most important concepts with high-yield topic prioritization.",
                features: ["Prioritized concept review", "Fast-paced learning mode", "Critical topics first"]
              },
              {
                icon: Brain,
                title: "Cross-Session Memory",
                description: "Your tutor remembers what you've learned and struggled with, creating personalized learning paths across all sessions.",
                features: ["Tracks knowledge gaps", "Circles back to weak areas", "Works across devices"]
              },
              {
                icon: Zap,
                title: "Interview Preparation",
                description: "Practice coding challenges and behavioral questions. Get real-time feedback and edge case testing.",
                features: ["Algorithm problem solving", "STAR format coaching", "Mock interview scenarios"]
              },
              {
                icon: MessageCircle,
                title: "Multi-Subject Support",
                description: "From Python programming to Italian grammar, math to cybersecurity—master any subject with adaptive teaching.",
                features: ["STEM and humanities", "Language learning support", "Subject-specific analogies"]
              }
            ].map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-2 hover:border-primary/50">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="relative pt-8">
                  <feature.icon className="mb-6 h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                  <h3 className="mb-4 text-2xl font-bold">{feature.title}</h3>
                  <p className="mb-6 text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Example Interactions Section */}
      <section className="py-24 lg:py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />
        
        <div className="container relative mx-auto px-4">
          <div className="mb-20 text-center">
            <Badge className="mb-4" variant="outline">
              <Brain className="mr-1.5 h-3 w-3" />
              Real Examples
            </Badge>
            <h2 className="mb-6 text-5xl font-bold lg:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              See It In Action
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground leading-relaxed">
              Real examples of how our AI tutor guides students through different subjects.
            </p>
          </div>

          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Python Example */}
            <Card className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-6 border-b">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">Python Programming</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Learning fundamentals through discovery</p>
                </div>
                <div className="space-y-6 p-8 bg-gradient-to-br from-card to-muted/20">
                  <div className="flex gap-4 animate-in fade-in slide-in-from-left duration-500">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                      <span className="text-sm font-bold">S</span>
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-accent/50 p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-base">"Teach me how to program in Python"</p>
                    </div>
                  </div>
                  <div className="flex gap-4 animate-in fade-in slide-in-from-right duration-500 delay-150">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 shadow-md">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-primary/10 p-4 shadow-sm border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Tutor</p>
                      <p className="text-base">"Have you programmed before? Let's start with print(). What do you think it does?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4 animate-in fade-in slide-in-from-left duration-500 delay-300">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                      <span className="text-sm font-bold">S</span>
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-accent/50 p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-base">"It probably prints things to the screen?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4 animate-in fade-in slide-in-from-right duration-500 delay-450">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 shadow-md">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-primary/10 p-4 shadow-sm border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Tutor</p>
                      <p className="text-base">"Good! Now try writing print('Hello') yourself and tell me what happens."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Math Example */}
            <Card className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-6 border-b">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">Algebra Problem Solving</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Guided reasoning with patience</p>
                </div>
                <div className="space-y-6 p-8 bg-gradient-to-br from-card to-muted/20">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                      <span className="text-sm font-bold">S</span>
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-accent/50 p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-base">"Solve: 5C + 2M = 3C + 4M. Do I subtract 10 from both sides?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 shadow-md">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-primary/10 p-4 shadow-sm border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Tutor</p>
                      <p className="text-base">"Let's think about this. We need to subtract a multiple of C or M. What would help isolate one variable?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                      <span className="text-sm font-bold">S</span>
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-accent/50 p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-base">"Oh, subtract 3C from both sides!"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 shadow-md">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-primary/10 p-4 shadow-sm border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Tutor</p>
                      <p className="text-base">"Perfect! Now what do we have? Walk me through the simplification."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language Example */}
            <Card className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-6 border-b">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">Italian Language Learning</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Gentle correction and practice</p>
                </div>
                <div className="space-y-6 p-8 bg-gradient-to-br from-card to-muted/20">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                      <span className="text-sm font-bold">S</span>
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-accent/50 p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-base">"Mi chiamo François. Sono de Francia"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 shadow-md">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-primary/10 p-4 shadow-sm border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Tutor</p>
                      <p className="text-base">"Great start! Small correction: it's 'di Francia' not 'de Francia'. The preposition 'di' means 'from' in Italian. Try saying it again?"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent shadow-md">
                      <span className="text-sm font-bold">S</span>
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-accent/50 p-4 shadow-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Student</p>
                      <p className="text-base">"Sono di Francia"</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 shadow-md">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-primary/10 p-4 shadow-sm border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Tutor</p>
                      <p className="text-base">"Perfect! Now let's practice more sentences about where you're from..."</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03),transparent_70%)]" />
        
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Sparkles className="mx-auto mb-6 h-12 w-12 text-primary animate-pulse" />
            <h2 className="mb-6 text-5xl font-bold lg:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              {session?.user ? `Keep Learning, ${userName}!` : "Ready to Transform Your Learning?"}
            </h2>
            <p className="mb-10 text-xl text-muted-foreground leading-relaxed">
              {session?.user
                ? "Jump back into your studies and continue mastering new concepts."
                : "Join thousands of students who are learning smarter, not harder."}
            </p>
            {session?.user ? (
              <Link href="/chat">
                <Button size="lg" className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Continue Learning
                </Button>
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-4 sm:flex-row">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-14 text-lg shadow-lg"
                  required
                />
                <Button type="submit" size="lg" className="h-14 px-8 text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                  Get Started
                </Button>
              </form>
            )}
            {!session?.user && (
              <p className="mt-6 text-sm text-muted-foreground">
                ✨ Start your free trial today • No credit card required • Cancel anytime
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="relative">
                  <GraduationCap className="h-8 w-8 text-primary" />
                  <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-primary/60" />
                </div>
                <h3 className="text-2xl font-bold">StudySphere</h3>
              </div>
              <p className="mb-6 text-muted-foreground leading-relaxed max-w-md">
                Your personal AI-powered study companion that uses the Socratic method to help 
                you truly understand concepts, not just memorize them.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </Button>
              </div>
            </div>
            <div>
              <h4 className="mb-6 font-bold text-lg">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 font-bold text-lg">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 StudySphere. All rights reserved. Made with ❤️ for learners everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}