
"use client";

import React, { useState } from "react";
import { collection, query, where, orderBy, doc, Timestamp, increment } from "firebase/firestore";
import { useAuth } from "@/components/auth-context";
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { InvestmentRecord } from "@/app/lib/db-schema";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  ArrowDownCircle
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function MyInvestmentsPage() {
  const { profile } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [collecting, setCollecting] = useState<string | null>(null);

  const investmentsQuery = useMemoFirebase(() => {
    if (!profile || !firestore) return null;
    return query(
      collection(firestore, "investments"),
      where("userId", "==", profile.uid),
      orderBy("startDate", "desc")
    );
  }, [profile, firestore]);

  const { data: investments, isLoading: loadingInvestments } = useCollection<InvestmentRecord>(investmentsQuery);

  const calculateAccrued = (inv: InvestmentRecord) => {
    if (inv.status !== "active") return 0;
    
    const now = new Date();
    const lastUpdate = inv.lastCollectionAt?.toDate() || inv.startDate.toDate();
    const elapsedSeconds = differenceInSeconds(now, lastUpdate);
    const dailyIncome = inv.dailyIncome;
    
    // Formula: (Daily Income / 86400 seconds in a day) * elapsed seconds
    const accrued = (dailyIncome / 86400) * elapsedSeconds;
    
    // Cap it to total remaining income
    const totalDurationSeconds = inv.endDate.toDate().getTime() - inv.startDate.toDate().getTime();
    const currentDurationSeconds = now.getTime() - inv.startDate.toDate().getTime();
    
    if (currentDurationSeconds >= totalDurationSeconds) {
       // Plan finished
       return 0; // The logic below would handle closing the plan
    }

    return Math.max(0, accrued);
  };

  const handleCollect = (inv: InvestmentRecord) => {
    if (!profile || !firestore) return;
    
    const accrued = calculateAccrued(inv);
    if (accrued < 1) {
      toast({ title: "Wait longer", description: "Accrued earnings must be at least ₦1 to collect." });
      return;
    }

    setCollecting(inv.id);

    // 1. Log transaction
    addDocumentNonBlocking(collection(firestore, "transactions"), {
      userId: profile.uid,
      type: "daily_earnings",
      amount: accrued,
      status: "approved",
      createdAt: Timestamp.now(),
      reference: `ERN-${Math.random().toString(36).substring(7).toUpperCase()}`,
      metadata: { planName: inv.planName, investmentId: inv.id }
    });

    // 2. Update user balance
    updateDocumentNonBlocking(doc(firestore, "users", profile.uid), {
      availableBalance: increment(accrued),
      totalEarnings: increment(accrued)
    });

    // 3. Update investment last collection
    updateDocumentNonBlocking(doc(firestore, "investments", inv.id), {
      lastCollectionAt: Timestamp.now()
    });

    toast({
      title: "Earnings Collected",
      description: `₦${accrued.toFixed(2)} has been added to your balance.`,
    });

    setCollecting(null);
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-headline font-bold">My Products</h2>
        <p className="text-muted-foreground">Track and collect your daily passive income</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loadingInvestments ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted" />
          ))
        ) : !investments || investments.length === 0 ? (
          <Card className="col-span-full border-none shadow-sm p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              <Briefcase className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-headline font-bold">No active products</h3>
              <p className="text-muted-foreground italic">You haven't purchased any investment products yet.</p>
            </div>
          </Card>
        ) : (
          investments.map((inv) => (
            <Card key={inv.id} className="border-none shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-4 bg-muted/30">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Product</p>
                  <CardTitle className="font-headline text-lg">{inv.planName}</CardTitle>
                </div>
                <Badge 
                  className={cn(
                    "font-bold text-[10px] uppercase",
                    inv.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : 
                    "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  )}
                >
                  {inv.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Daily Income</p>
                    <p className="font-bold text-xl text-emerald-600">₦{inv.dailyIncome.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Total Value</p>
                    <p className="font-bold text-xl">₦{inv.totalIncome.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl space-y-2 border border-primary/10">
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-muted-foreground font-bold">Accrued Earnings:</span>
                     <span className="text-lg font-black text-primary">₦{calculateAccrued(inv).toFixed(2)}</span>
                   </div>
                   <Button 
                    className="w-full h-10 gap-2" 
                    onClick={() => handleCollect(inv)}
                    disabled={collecting === inv.id || inv.status !== "active" || calculateAccrued(inv) < 1}
                   >
                     {collecting === inv.id ? "Collecting..." : (
                       <><ArrowDownCircle className="w-4 h-4" /> Collect Earnings</>
                     )}
                   </Button>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>End Date</span>
                    </div>
                    <span>{format(inv.endDate.toDate(), "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Last Collection</span>
                    </div>
                    <span>{inv.lastCollectionAt ? format(inv.lastCollectionAt.toDate(), "HH:mm, MMM dd") : "Never"}</span>
                  </div>
                </div>

                {inv.status === "active" ? (
                  <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-3 text-emerald-700 text-xs border border-emerald-100">
                    <TrendingUp className="w-4 h-4" />
                    <p className="font-medium">Earnings accrue every second.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3 text-blue-700 text-xs border border-blue-100">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="font-medium">Product duration reached.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
