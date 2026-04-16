
"use client";

import React from "react";
import { collection, query } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, PieChart, Activity, Settings, History, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/app/lib/db-schema";

export default function AdminDashboard() {
  const { firestore } = useFirebase();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"));
  }, [firestore]);

  const { data: users, isLoading: loadingUsers } = useCollection<UserProfile>(usersQuery);

  const stats = React.useMemo(() => {
    if (!users) return { totalUsers: 0, totalBalance: 0, totalInvested: 0 };
    return {
      totalUsers: users.length,
      totalBalance: users.reduce((acc, u) => acc + (u.availableBalance || 0), 0),
      totalInvested: users.reduce((acc, u) => acc + (u.investedBalance || 0), 0),
    };
  }, [users]);

  const adminStats = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Asset Pool", value: `₦${((stats.totalBalance || 0) + (stats.totalInvested || 0)).toLocaleString()}`, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Invested Funds", value: `₦${(stats.totalInvested || 0).toLocaleString()}`, icon: PieChart, color: "text-primary", bg: "bg-primary/10" },
    { label: "System Status", value: "Active", icon: Activity, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-headline font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">Global platform overview and mission control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminStats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm group hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <h3 className="text-2xl font-headline font-bold">{loadingUsers ? "..." : stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Operational Control</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/admin/users" className="block">
              <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
                <Users className="w-5 h-5" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/plans" className="block">
              <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:bg-primary/5 hover:text-primary transition-colors">
                <TrendingUp className="w-5 h-5" />
                Investment Plans
              </Button>
            </Link>
            <Link href="/admin/requests" className="block">
              <Button variant="outline" className="w-full h-24 flex-col gap-2 relative hover:bg-orange-50 hover:text-orange-600 transition-colors">
                <Clock className="w-5 h-5" />
                Action Queue
              </Button>
            </Link>
            <Link href="/admin/transactions" className="block">
              <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <History className="w-5 h-5" />
                Transaction Explorer
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-lg">System Utilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/settings" className="block w-full">
              <Button variant="outline" className="w-full h-12 gap-2 justify-start px-6">
                <Settings className="w-5 h-5" />
                Global Platform Settings
              </Button>
            </Link>
            <div className="p-6 bg-muted/30 rounded-xl border border-dashed flex items-center justify-center text-center">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                Platform analytics and performance metrics <br /> will populate as data volume increases.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
