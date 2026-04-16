
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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, User, Info, Search, Filter, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AdminTransactionsExplorer() {
  const { firestore } = useFirebase();
  const { profile: adminProfile, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"withdrawal" | "deposit">("withdrawal");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  const transactionsQuery = useMemoFirebase(() => {
    // Only query if confirmed as admin and auth state is settled.
    if (!firestore || authLoading || !isAdmin || adminProfile?.role !== 'admin') return null;
    
    let constraints: any[] = [
      where("type", "==", activeTab),
      orderBy("createdAt", "desc")
    ];

    if (statusFilter !== "all") {
      constraints.push(where("status", "==", statusFilter));
    }
    
    return query(
      collection(firestore, "transactions"),
      ...constraints
    );
  }, [firestore, isAdmin, authLoading, activeTab, statusFilter, adminProfile?.role]);

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
      details: `${action === "approve" ? "Success" : "Rejected"} Transaction ${request.reference} for user ${request.userId}`
    });

    toast({
      title: action === "approve" ? "Success" : "Rejected",
      description: `Transaction ${request.reference} has been processed.`,
    });
  };

  const isLoading = authLoading || collectionLoading;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-headline font-bold">Transaction Explorer</h2>
            <p className="text-muted-foreground">Audit all platform financial movements</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 w-[140px] text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-4 text-destructive">
            <ShieldAlert className="w-6 h-6" />
            <div className="space-y-1">
              <p className="font-bold">Access Error</p>
              <p className="text-sm">
                Administrator permissions are required to access this data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 mb-6">
          <TabsTrigger value="withdrawal" className="font-headline font-bold">Withdrawals</TabsTrigger>
          <TabsTrigger value="deposit" className="font-headline font-bold">Deposits</TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>User / Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell></TableRow>
                ) : !transactions || transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 space-y-4">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="italic text-muted-foreground font-medium">No records found.</p>
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
                      <TableCell className="font-black">₦{tx.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "capitalize text-[10px] font-bold",
                            tx.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                            tx.status === "pending" ? "bg-orange-50 text-orange-700 border-orange-200" : 
                            "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.createdAt ? format(tx.createdAt.toDate(), "MMM dd, HH:mm") : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedTx(tx)}>
                              <Info className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="font-headline text-xl">Transaction Audit</DialogTitle>
                              <DialogDescription>Reference: {tx.reference}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted rounded-xl space-y-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Type</p>
                                  <p className="font-bold capitalize">{tx.type}</p>
                                </div>
                                <div className="p-3 bg-muted rounded-xl space-y-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</p>
                                  <p className="font-bold capitalize">{tx.status}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User UID</p>
                                <p className="font-mono text-xs bg-muted p-2 rounded truncate">{tx.userId}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</p>
                                <p className="text-2xl font-black text-primary">₦{tx.amount.toLocaleString()}</p>
                              </div>
                              {tx.metadata && (
                                <div className="space-y-2 pt-2 border-t">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Extended Metadata</p>
                                  <pre className="bg-muted p-4 rounded-xl text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-[200px]">
                                    {JSON.stringify(tx.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            <DialogFooter className="flex flex-row gap-2">
                              {tx.status === "pending" && (
                                <>
                                  <Button variant="outline" className="flex-1" onClick={() => handleAction(tx, "reject")}>Reject</Button>
                                  <Button className="flex-1" onClick={() => handleAction(tx, "approve")}>Approve</Button>
                                </>
                              )}
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

    