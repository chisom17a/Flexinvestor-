"use client";

import React from "react";
import { useAuth } from "@/components/auth-context";
import { useSettings } from "@/components/settings-context";
import { Navbar } from "@/components/navbar";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const settings = useSettings();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!user || !profile) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Navbar />
      
      {settings?.maintenanceMode && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4" />
          Platform is currently in Maintenance Mode. Some actions may be restricted.
        </div>
      )}

      {settings?.announcement && (
        <div className="bg-accent/10 text-accent-foreground border-b border-accent/20 px-4 py-2 text-center text-sm font-medium">
          📢 {settings.announcement}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
