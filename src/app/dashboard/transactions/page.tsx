
"use client";

import React from "react";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { TransactionRecord } from "@/app/lib/db-schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Users, 
  Zap,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
  const { profile } = useAuth();
  const { firestore } = useFirebase();

  const transactionsQuery = useMemoFirebase(() => {
    if (!profile || !firestore) return null;
    return query(
      collection(firestore, "transactions"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
  }, [profile, firestore]);

  const { data: transactions, isLoading } = useCollection<TransactionRecord>(transactionsQuery);

  const getIcon = (type: string) => {
    switch (type) {
      case "deposit": return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case "withdrawal": return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      case "investment": return <Zap className="w-4 h-4 text-primary" />;
      case "referral_bonus": return <Users className="w-4 h-4 text-accent" />;
      default: return <Wallet className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-headline font-bold">Transaction History</h2>
          <p className="text-muted-foreground">Comprehensive record of all your platform activity</p>
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="px-6 py-4">Transaction Details</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground animate-pulse font-medium">Loading your transactions...</td></tr>
                ) : transactions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <History className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground font-medium italic">No transactions found in your history.</p>
                    </td>
                  </tr>
                ) : (
                  transactions?.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-muted group-hover:bg-white transition-colors flex items-center justify-center shadow-sm">
                            {getIcon(tx.type)}
                          </div>
                          <div>
                            <p className="font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                            {tx.metadata?.planName && <p className="text-[10px] text-muted-foreground font-medium uppercase">{tx.metadata.planName} Plan</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-[10px] bg-muted px-2 py-1 rounded-md font-mono text-muted-foreground">{tx.reference}</code>
                      </td>
                      <td className={cn(
                        "px-6 py-4 font-bold text-base",
                        ["deposit", "referral_bonus"].includes(tx.type) ? "text-emerald-500" : "text-destructive"
                      )}>
                        {["deposit", "referral_bonus"].includes(tx.type) ? "+" : "-"}₦{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight",
                          tx.status === "approved" ? "bg-emerald-100 text-emerald-700" : 
                          tx.status === "pending" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {tx.createdAt ? format(tx.createdAt.toDate(), "MMM dd, yyyy · HH:mm") : "N/A"}
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

    