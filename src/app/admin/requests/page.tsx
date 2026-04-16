
"use client";

import React, { useState } from "react";
import { collection, query, where, orderBy, doc, increment, Timestamp } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { TransactionRecord } from "@/app/lib/db-schema";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, User, ShieldAlert, History, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminPendingRequestsPage() {
  const { firestore } = useFirebase();
  const { profile: adminProfile, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"withdrawal" | "deposit">("withdrawal");

  const transactionsQuery = useMemoFirebase(() => {
    // Only attempt the query if we are confirmed as an admin AND loading is done.
    if (!firestore || authLoading || !isAdmin || adminProfile?.role !== 'admin') return null;
    
    return query(
      collection(firestore, "transactions"),
      where("type", "==", activeTab),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, isAdmin, authLoading, activeTab, adminProfile?.role]);

  const { data: transactions, isLoading: collectionLoading, error } = useCollection<TransactionRecord>(transactionsQuery);

  const handleAction = (request: TransactionRecord, action: "approve" | "reject") => {
    if (!firestore || !adminProfile) return;

    const newStatus = action === "approve" ? "approved" : "rejected";
    
    updateDocumentNonBlocking(doc(firestore, "transactions", request.id), {
      status: newStatus
    });

    if (action === "reject" && request.type === "withdrawal") {
      updateDocumentNonBlocking(doc(firestore, "users", request.userId), {
        availableBalance: increment(request.amount)
      });
    }

    addDocumentNonBlocking(collection(firestore, "admin_logs"), {
      action: `${action.toUpperCase()}_${request.type.toUpperCase()}`,
      adminId: adminProfile.uid,
      timestamp: Timestamp.now(),
      details: `${action === "approve" ? "Approved" : "Rejected"} ${request.type} ${request.reference} for user ${request.userId}`
    });

    toast({
      title: action === "approve" ? "Approved" : "Rejected",
      description: `Request ${request.reference} has been processed.`,
    });
  };

  const isLoading = authLoading || collectionLoading;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-headline font-bold">Pending Requests</h2>
          <p className="text-muted-foreground">Actionable financial requests awaiting administrator approval</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          variant={activeTab === "withdrawal" ? "default" : "outline"} 
          onClick={() => setActiveTab("withdrawal")}
          className="font-headline font-bold"
        >
          Withdrawals
        </Button>
        <Button 
          variant={activeTab === "deposit" ? "default" : "outline"} 
          onClick={() => setActiveTab("deposit")}
          className="font-headline font-bold"
        >
          Deposits
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-4 text-destructive">
            <ShieldAlert className="w-6 h-6" />
            <div className="space-y-1">
              <p className="font-bold">Access Denied</p>
              <p className="text-sm">
                Administrator permissions are required. Please ensure you have the correct role assigned.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>User / Ref</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </TableCell></TableRow>
              ) : !transactions || transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 space-y-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="italic text-muted-foreground font-medium">No pending {activeTab}s found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1.5"><User className="w-3 h-3 text-primary" />{tx.userId.substring(0, 8)}...</span>
                        <code className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1.5 rounded">{tx.reference}</code>
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-base">₦{tx.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {tx.createdAt ? format(tx.createdAt.toDate(), "MMM dd, HH:mm") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10 border-destructive/20"
                          onClick={() => handleAction(tx, "reject")}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                          onClick={() => handleAction(tx, "approve")}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-center pt-8">
        <Link href="/admin/transactions">
          <Button variant="link" className="text-muted-foreground gap-2">
            <History className="w-4 h-4" />
            View full transaction history
          </Button>
        </Link>
      </div>
    </div>
  );
}

    