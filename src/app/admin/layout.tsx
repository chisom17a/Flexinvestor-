"use client";

import React from "react";
import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/navbar";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [user, isAdmin, loading, router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
  
  if (!user || !isAdmin) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Navbar />
      
      <header className="h-12 border-b flex items-center justify-between px-6 bg-destructive/10 shrink-0">
        <div className="flex items-center gap-2 text-destructive font-headline font-bold text-sm">
          <ShieldAlert className="w-4 h-4" />
          <span>ADMIN CONSOLE</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          Role: SUPER_ADMIN_ACCESS
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
