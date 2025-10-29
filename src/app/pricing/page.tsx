"use client";

import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LogOut, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PricingTable } from "@/components/autumn/pricing-table";

export default function PricingPage() {
  const { data: session, isPending, refetch } = useSession();
  const router = useRouter();

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

  const productDetails = [
    {
      id: "student_starter",
      description: "Perfect for getting started with AI-powered tutoring",
      items: [
        {
          primaryText: "50 AI messages per month",
          secondaryText: "Reset monthly",
        },
        {
          primaryText: "Basic chat features",
          secondaryText: "Full Socratic tutoring",
        },
        {
          primaryText: "All subjects supported",
          secondaryText: "Math, science, languages & more",
        },
      ],
    },
    {
      id: "study_pro",
      description: "For serious students who need more power",
      recommendText: "Most Popular",
      price: {
        primaryText: "$9.99/month",
        secondaryText: "billed monthly",
      },
      items: [
        {
          featureId: "messages",
        },
        {
          featureId: "priority_response",
        },
        {
          featureId: "advanced_flashcards",
        },
        {
          featureId: "pdf_upload",
        },
        {
          featureId: "cross_session_memory",
        },
      ],
    },
    {
      id: "study_elite",
      description: "Maximum power for exam prep and interview practice",
      price: {
        primaryText: "$19.99/month",
        secondaryText: "billed monthly",
      },
      items: [
        {
          primaryText: "Unlimited AI messages",
          secondaryText: "No limits, ever",
        },
        {
          featureId: "priority_response",
        },
        {
          featureId: "advanced_flashcards",
        },
        {
          featureId: "pdf_upload",
        },
        {
          featureId: "cross_session_memory",
        },
        {
          featureId: "deep_thinking_mode",
        },
        {
          featureId: "interview_prep",
        },
        {
          featureId: "priority_support",
        },
        {
          featureId: "advanced_analytics",
        },
      ],
    },
  ];

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
                  <Button variant="ghost" size="sm" className="bg-primary/10">
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
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : session?.user ? (
              <>
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
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">
              Pricing Plans
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Choose Your Learning Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free and upgrade anytime. All plans include our AI-powered Socratic tutoring method.
            </p>
          </div>
        </div>

        <PricingTable productDetails={productDetails} />

        {/* Features Comparison */}
        <div className="mt-20 mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">Student Starter</th>
                  <th className="text-center p-4 font-semibold">Study Pro</th>
                  <th className="text-center p-4 font-semibold">Study Elite</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4">AI Messages</td>
                  <td className="text-center p-4">50/month</td>
                  <td className="text-center p-4">500/month</td>
                  <td className="text-center p-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Socratic Questioning</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Multi-Subject Support</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Priority Response</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Advanced Flashcards</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">PDF Upload & Quiz Generation</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Cross-Session Memory</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Deep Thinking Mode</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Interview Preparation</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Priority Support</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4">Advanced Analytics</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">-</td>
                  <td className="text-center p-4">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I switch plans anytime?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens when I reach my message limit?</h3>
              <p className="text-muted-foreground">
                On the free plan, you'll need to upgrade to continue chatting. Pro users can upgrade to Elite for unlimited messages.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do message limits reset?</h3>
              <p className="text-muted-foreground">
                Yes, message limits reset monthly on your billing date.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground">
                Absolutely. You can cancel your subscription at any time from your billing portal. You'll retain access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Contact Support
            </Link>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 StudySphere. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
