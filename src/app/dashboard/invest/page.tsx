
"use client";

import React, { useState } from "react";
import { collection, query, where, Timestamp, doc, increment, getDocs, limit } from "firebase/firestore";
import { useAuth } from "@/components/auth-context";
import { useSettings } from "@/components/settings-context";
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { InvestmentPlan } from "@/app/lib/db-schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Coins, ShieldCheck, Zap } from "lucide-react";

export default function InvestPage() {
  const { profile } = useAuth();
  const { firestore } = useFirebase();
  const settings = useSettings();
  const { toast } = useToast();
  
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "plans"), where("isActive", "==", true));
  }, [firestore]);

  const { data: plans } = useCollection<InvestmentPlan>(plansQuery);

  const handlePurchase = async () => {
    if (!profile || !firestore || !selectedPlan || !settings) return;

    if (selectedPlan.price > profile.availableBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "You don't have enough funds in your available balance to purchase this product.",
      });
      return;
    }

    setLoading(true);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + selectedPlan.time);

    // 1. Create investment record
    addDocumentNonBlocking(collection(firestore, "investments"), {
      userId: profile.uid,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      price: selectedPlan.price,
      dailyIncome: selectedPlan.dailyIncome,
      totalIncome: selectedPlan.totalIncome,
      cashback: selectedPlan.cashback,
      startDate: Timestamp.now(),
      endDate: Timestamp.fromDate(endDate),
      lastCollectionAt: Timestamp.now(),
      status: "active",
    });

    // 2. Main Transaction (Deduction)
    addDocumentNonBlocking(collection(firestore, "transactions"), {
      userId: profile.uid,
      type: "investment",
      amount: selectedPlan.price,
      status: "approved",
      createdAt: Timestamp.now(),
      reference: `PRD-${Math.random().toString(36).substring(7).toUpperCase()}`,
      metadata: { planName: selectedPlan.name }
    });

    // 3. Cashback Transaction (if any)
    if (selectedPlan.cashback > 0) {
      addDocumentNonBlocking(collection(firestore, "transactions"), {
        userId: profile.uid,
        type: "referral_bonus", // Reusing for instant credit
        amount: selectedPlan.cashback,
        status: "approved",
        createdAt: Timestamp.now(),
        reference: `CSH-${Math.random().toString(36).substring(7).toUpperCase()}`,
        metadata: { source: "Plan Cashback", planName: selectedPlan.name }
      });
    }

    // 4. Referral Bonus Logic
    if (profile.referredBy) {
      const bonusAmount = (selectedPlan.price * settings.referralPercent) / 100;
      
      // Find the inviter
      const inviterQuery = query(collection(firestore, "users"), where("referralCode", "==", profile.referredBy), limit(1));
      const inviterSnap = await getDocs(inviterQuery);
      
      if (!inviterSnap.empty) {
        const inviterDoc = inviterSnap.docs[0];
        const inviterId = inviterDoc.id;

        // Credit inviter
        updateDocumentNonBlocking(doc(firestore, "users", inviterId), {
          availableBalance: increment(bonusAmount),
          totalEarnings: increment(bonusAmount)
        });

        // Log referral transaction
        addDocumentNonBlocking(collection(firestore, "transactions"), {
          userId: inviterId,
          type: "referral_bonus",
          amount: bonusAmount,
          status: "approved",
          createdAt: Timestamp.now(),
          reference: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
          metadata: { referredUser: profile.username, productPrice: selectedPlan.price }
        });
      }
    }

    // 5. Update user balance
    updateDocumentNonBlocking(doc(firestore, "users", profile.uid), {
      availableBalance: increment(-selectedPlan.price + selectedPlan.cashback),
      investedBalance: increment(selectedPlan.price)
    });

    toast({
      title: "Purchase Successful!",
      description: `You've purchased ${selectedPlan.name}. Check your investments for daily earnings.`,
    });
    
    setSelectedPlan(null);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-headline font-bold">Investment Products</h2>
        <p className="text-muted-foreground">Select a high-yield product to start earning daily income</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!plans || plans.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 bg-card rounded-2xl border">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground font-medium">No active products available at the moment.</p>
          </div>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="border-none shadow-md overflow-hidden flex flex-col hover:scale-[1.02] transition-transform">
              <CardHeader className="bg-primary text-white pb-8 relative">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">{plan.time} Days</Badge>
                  <ShieldCheck className="w-6 h-6 opacity-40" />
                </div>
                <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">₦{plan.price.toLocaleString()}</span>
                  <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Price</span>
                </div>
                {plan.cashback > 0 && (
                  <Badge className="absolute bottom-4 right-6 bg-accent text-white border-none animate-pulse">
                    ₦{plan.cashback.toLocaleString()} Instant Cashback
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-6 space-y-4 -mt-4 bg-card rounded-t-2xl relative">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Daily Income</p>
                    <p className="font-bold text-lg text-emerald-600">₦{plan.dailyIncome.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Total Return</p>
                    <p className="font-bold text-lg">₦{plan.totalIncome.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Duration: {plan.time} Days</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Coins className="w-4 h-4 text-primary" />
                    <span>Earnings credited daily</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 bg-card">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full h-11 text-lg font-headline" 
                      onClick={() => setSelectedPlan(plan)}
                    >
                      Buy Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="font-headline text-2xl">Confirm Purchase</DialogTitle>
                      <DialogDescription>
                        Unlock daily earnings with the {plan.name} product.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="p-6 bg-muted rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Product Price:</span>
                          <span className="text-xl font-bold">₦{plan.price.toLocaleString()}</span>
                        </div>
                        {plan.cashback > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Cashback (Instant):</span>
                            <span className="text-emerald-500 font-bold">₦{plan.cashback.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="pt-4 border-t flex justify-between items-center">
                           <span className="text-sm font-bold">Your Balance:</span>
                           <span className={profile?.availableBalance >= plan.price ? "text-emerald-600 font-bold" : "text-destructive font-bold"}>
                             ₦{profile?.availableBalance.toLocaleString()}
                           </span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <p>By clicking confirm, you agree to the product terms and validity of {plan.time} days.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        onClick={handlePurchase} 
                        className="w-full h-12 text-lg"
                        disabled={loading || !profile || profile.availableBalance < plan.price}
                      >
                        {loading ? "Processing..." : "Confirm & Unlock"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
