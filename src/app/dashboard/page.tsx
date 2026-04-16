
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useSettings } from "@/components/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Users,
  Sparkles,
  ExternalLink,
  Gift,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, query, where, orderBy, limit, Timestamp, doc, increment } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { TransactionRecord } from "@/app/lib/db-schema";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function DashboardOverview() {
  const { profile } = useAuth();
  const { firestore } = useFirebase();
  const settings = useSettings();
  const { toast } = useToast();
  
  const [showWelcome, setShowWelcome] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    // Show welcome pop-up only once per session if settings exist and have content
    const hasSeenWelcome = sessionStorage.getItem("flexinvest_welcome_seen");
    if (!hasSeenWelcome && settings?.welcomeTitle) {
      // Small delay for better UX
      const timer = setTimeout(() => setShowWelcome(true), 800);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    sessionStorage.setItem("flexinvest_welcome_seen", "true");
  };

  const handleClaimWelcomeBonus = () => {
    if (!profile || !settings || !firestore || profile.welcomeBonusClaimed) return;
    
    setIsClaiming(true);
    const amount = settings.welcomeBonusAmount || 500;

    // 1. Log transaction
    addDocumentNonBlocking(collection(firestore, "transactions"), {
      userId: profile.uid,
      type: "welcome_bonus",
      amount: amount,
      status: "approved",
      createdAt: Timestamp.now(),
      reference: `WLC-${Math.random().toString(36).substring(7).toUpperCase()}`,
      metadata: { source: "One-time Welcome Bonus" }
    });

    // 2. Update user profile
    updateDocumentNonBlocking(doc(firestore, "users", profile.uid), {
      availableBalance: increment(amount),
      totalEarnings: increment(amount),
      welcomeBonusClaimed: true
    });

    toast({
      title: "Bonus Claimed!",
      description: `₦${amount.toLocaleString()} has been added to your balance.`,
    });
    
    setIsClaiming(false);
  };

  const transactionsQuery = useMemoFirebase(() => {
    if (!profile || !firestore) return null;
    return query(
      collection(firestore, "transactions"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
  }, [profile, firestore]);

  const { data: transactions, isLoading: loadingTx } = useCollection<TransactionRecord>(transactionsQuery);

  if (!profile) return null;

  const stats = [
    { 
      label: "Available Balance", 
      value: profile.availableBalance || 0, 
      icon: Wallet, 
      color: "text-primary", 
      bg: "bg-primary/10" 
    },
    { 
      label: "Invested Value", 
      value: profile.investedBalance || 0, 
      icon: TrendingUp, 
      color: "text-accent", 
      bg: "bg-accent/10" 
    },
    { 
      label: "Total Earnings", 
      value: profile.totalEarnings || 0, 
      icon: DollarSign, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10" 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Pop-up */}
      <Dialog open={showWelcome} onOpenChange={handleCloseWelcome}>
        <DialogContent className="max-w-md border-none shadow-2xl p-0 overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <div className="p-8 space-y-6">
            <DialogHeader className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary animate-bounce-subtle">
                <Sparkles className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-3xl font-headline font-bold text-foreground">
                  {settings?.welcomeTitle || "Welcome!"}
                </DialogTitle>
                <p className="text-lg font-headline font-bold text-primary">
                  Hello dear {profile.username}!
                </p>
              </div>
              <DialogDescription className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap text-center">
                {settings?.welcomeMessage}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-2">
              {settings?.welcomeButtons?.map((btn, i) => (
                <Button key={i} asChild className="w-full h-12 text-base font-headline gap-2 group shadow-sm">
                  <a href={btn.url} target="_blank" rel="noopener noreferrer">
                    {btn.label}
                    <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </a>
                </Button>
              ))}
              <Button variant="ghost" onClick={handleCloseWelcome} className="w-full text-muted-foreground hover:text-foreground">
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Bonus Strip */}
      {!profile.welcomeBonusClaimed && settings?.welcomeBonusAmount && (
        <Card className="border-none shadow-md bg-accent text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <Gift className="w-20 h-20" />
          </div>
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-headline font-bold text-xl">One-Time Welcome Bonus!</h4>
                <p className="text-white/80 text-sm">Claim your ₦{settings.welcomeBonusAmount.toLocaleString()} gift and start your journey.</p>
              </div>
            </div>
            <Button 
              onClick={handleClaimWelcomeBonus} 
              disabled={isClaiming}
              className="bg-white text-accent hover:bg-white/90 font-headline font-bold h-11 px-8 shadow-lg"
            >
              {isClaiming ? "Claiming..." : "Claim Now"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <h3 className="text-3xl font-headline font-bold">
                    ₦{(stat.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Portfolio Health</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] w-full pt-0 flex flex-col items-center justify-center space-y-4">
             <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <p className="text-muted-foreground text-sm italic text-center max-w-xs">
               Your investment portfolio is active and generating daily income. Visit the products page to expand your wealth.
             </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/invest" className="block w-full">
              <button className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-xl hover:opacity-90 transition-all hover:scale-[1.02]">
                <span className="font-medium">Buy Products</span>
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/dashboard/wallet" className="block w-full">
              <button className="w-full flex items-center justify-between p-4 bg-card border hover:bg-muted rounded-xl transition-colors">
                <span className="font-medium">Request Payout</span>
                <ArrowDownRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/dashboard/referral" className="block w-full">
              <button className="w-full flex items-center justify-between p-4 bg-card border hover:bg-muted rounded-xl transition-colors">
                <span className="font-medium">Network Center</span>
                <Users className="w-5 h-5" />
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline text-lg">Platform Activity</CardTitle>
          <Link href="/dashboard/transactions" className="text-sm text-primary font-medium hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingTx ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading transactions...</td>
                  </tr>
                ) : transactions?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">No recent activity.</td>
                  </tr>
                ) : (
                  transactions?.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium capitalize">{tx.type.replace('_', ' ')}</td>
                      <td className={cn(
                        "px-6 py-4 font-semibold",
                        ['deposit', 'referral_bonus', 'daily_earnings', 'welcome_bonus'].includes(tx.type) ? "text-emerald-500" : "text-red-500"
                      )}>
                        {['deposit', 'referral_bonus', 'daily_earnings', 'welcome_bonus'].includes(tx.type) ? '+' : '-'}₦{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          tx.status === "approved" ? "bg-emerald-100 text-emerald-700" : 
                          tx.status === "pending" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {tx.createdAt ? format(tx.createdAt.toDate(), "MMM dd, HH:mm") : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
