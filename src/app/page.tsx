
"use client";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { TrendingUp, Shield, Zap, ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card py-4 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link href="/dashboard">
                <Button variant="default" className="gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <section className="text-center max-w-3xl my-16 space-y-6">
          <h1 className="text-5xl md:text-6xl font-headline font-bold text-foreground leading-tight">
            Grow Your Wealth with <span className="text-primary">Precision</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The next generation investment platform offering real-time tracking, transparent returns, and secure asset management.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            {!user && (
              <Link href="/register">
                <Button size="lg" className="px-8 h-12 text-lg gap-2">
                  Start Investing Now <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 grid md:grid-cols-3 gap-8 mb-20">
          {[
            {
              title: "Secure & Transparent",
              desc: "Every transaction is logged and secured using military-grade encryption.",
              icon: Shield
            },
            {
              title: "Real-time Analytics",
              desc: "Watch your balance grow in real-time with our dynamic dashboard.",
              icon: TrendingUp
            },
            {
              title: "Lightning Fast",
              desc: "Deposits and withdrawals processed with unmatched speed.",
              icon: Zap
            }
          ].map((feature, i) => (
            <Card key={i} className="border-none shadow-md hover:shadow-xl transition-shadow bg-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/20 text-accent rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <CardTitle className="font-headline">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="py-8 border-t bg-card text-center text-muted-foreground">
        <p>&copy; 2024 FlexInvest Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
