
"use client";

import React, { useState } from "react";
import { collection, query, doc, orderBy, increment, Timestamp, where, limit } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { UserProfile, TransactionRecord, AdminLog } from "@/app/lib/db-schema";
import { useAuth } from "@/components/auth-context";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MoreHorizontal, 
  Shield, 
  UserX, 
  UserCheck, 
  ShieldAlert, 
  ArrowLeft, 
  Eye, 
  TrendingUp, 
  Wallet,
  History,
  Info,
  Save
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const { firestore } = useFirebase();
  const { profile: adminProfile } = useAuth();
  const { toast } = useToast();
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"available" | "invested">("available");
  const [adjustAction, setAdjustAction] = useState<"add" | "subtract">("add");
  const [adjustReason, setAdjustReason] = useState("");

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  // Memoized query for selected user's transactions
  const userTransactionsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedUser) return null;
    return query(
      collection(firestore, "transactions"),
      where("userId", "==", selectedUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, selectedUser]);

  const { data: userTransactions, isLoading: loadingTx } = useCollection<TransactionRecord>(userTransactionsQuery);

  const toggleSuspension = (user: UserProfile) => {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, "users", user.uid), {
      isSuspended: !user.isSuspended
    });
    
    // Log admin action
    addDocumentNonBlocking(collection(firestore, "admin_logs"), {
      action: user.isSuspended ? "UNSUSPEND_USER" : "SUSPEND_USER",
      adminId: adminProfile?.uid || "unknown",
      timestamp: Timestamp.now(),
      details: `${user.isSuspended ? "Unsuspended" : "Suspended"} user ${user.username} (${user.uid})`
    });

    toast({
      title: user.isSuspended ? "User Unsuspended" : "User Suspended",
      description: `${user.username}'s access has been updated.`,
    });
  };

  const toggleRole = (user: UserProfile) => {
    if (!firestore) return;
    const newRole = user.role === "admin" ? "user" : "admin";
    updateDocumentNonBlocking(doc(firestore, "users", user.uid), {
      role: newRole
    });

    // Log admin action
    addDocumentNonBlocking(collection(firestore, "admin_logs"), {
      action: "CHANGE_USER_ROLE",
      adminId: adminProfile?.uid || "unknown",
      timestamp: Timestamp.now(),
      details: `Changed role of ${user.username} to ${newRole}`
    });

    toast({
      title: "Role Updated",
      description: `${user.username} is now a ${newRole}.`,
    });
  };

  const handleAdjustBalance = () => {
    if (!firestore || !selectedUser || !adjustAmount || !adminProfile) return;
    
    const amountNum = parseFloat(adjustAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount" });
      return;
    }

    const finalAmount = adjustAction === "add" ? amountNum : -amountNum;
    const fieldToUpdate = adjustType === "available" ? "availableBalance" : "investedBalance";

    // 1. Update User Balance
    updateDocumentNonBlocking(doc(firestore, "users", selectedUser.uid), {
      [fieldToUpdate]: increment(finalAmount)
    });

    // 2. Create Transaction for User
    addDocumentNonBlocking(collection(firestore, "transactions"), {
      userId: selectedUser.uid,
      type: adjustAction === "add" ? "deposit" : "withdrawal",
      amount: amountNum,
      status: "approved",
      createdAt: Timestamp.now(),
      reference: `ADM-${Math.random().toString(36).substring(7).toUpperCase()}`,
      metadata: { 
        adminAdjustment: true, 
        adminId: adminProfile.uid,
        reason: adjustReason || "Administrative adjustment",
        balanceType: adjustType
      }
    });

    // 3. Log Admin Action
    addDocumentNonBlocking(collection(firestore, "admin_logs"), {
      action: "ADJUST_BALANCE",
      adminId: adminProfile.uid,
      timestamp: Timestamp.now(),
      details: `${adjustAction.toUpperCase()} ${amountNum} to ${selectedUser.username}'s ${adjustType} balance. Reason: ${adjustReason}`
    });

    toast({
      title: "Balance Adjusted",
      description: `Successfully ${adjustAction === "add" ? "added" : "subtracted"} ₦${amountNum.toLocaleString()} ${adjustAction === "add" ? "to" : "from"} ${selectedUser.username}'s ${adjustType} balance.`,
    });

    setAdjustAmount("");
    setAdjustReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-headline font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage platform users, roles, and access</p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-headline">All Users ({users?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading users...</TableCell>
                </TableRow>
              ) : users?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No users found.</TableCell>
                </TableRow>
              ) : (
                users?.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isSuspended ? "outline" : "default"} className={user.isSuspended ? "text-destructive border-destructive" : "bg-emerald-500"}>
                        {user.isSuspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>Avail: ₦{user.availableBalance?.toLocaleString()}</span>
                        <span className="text-muted-foreground">Inv: ₦{user.investedBalance?.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{user.referralCount}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsDetailOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details & Manage
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleSuspension(user)}>
                            {user.isSuspended ? (
                              <><UserCheck className="w-4 h-4 mr-2" /> Unsuspend User</>
                            ) : (
                              <><UserX className="w-4 h-4 mr-2" /> Suspend User</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleRole(user)}>
                            {user.role === "admin" ? (
                              <><Shield className="w-4 h-4 mr-2" /> Make Regular User</>
                            ) : (
                              <><ShieldAlert className="w-4 h-4 mr-2" /> Make Admin</>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Detail & Management Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">User Profile: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              UID: {selectedUser?.uid} | Registered: {selectedUser?.createdAt ? format(selectedUser.createdAt.toDate(), "PPP") : "N/A"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview & Info</TabsTrigger>
              <TabsTrigger value="balance">Adjust Balance</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Registration Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedUser?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-medium">{selectedUser?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <Badge variant={selectedUser?.role === "admin" ? "destructive" : "secondary"}>{selectedUser?.role}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referral Code:</span>
                      <span className="font-mono">{selectedUser?.referralCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referred By:</span>
                      <span className="font-medium">{selectedUser?.referredBy || "Direct"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      Financial Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Balance:</span>
                      <span className="font-bold text-lg text-primary">₦{selectedUser?.availableBalance?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invested Balance:</span>
                      <span className="font-bold">₦{selectedUser?.investedBalance?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Earnings:</span>
                      <span className="font-bold text-emerald-500">₦{selectedUser?.totalEarnings?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referral Count:</span>
                      <span className="font-medium">{selectedUser?.referralCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="balance" className="space-y-6 py-4">
              <div className="bg-muted/50 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Adjustment Type</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant={adjustAction === "add" ? "default" : "outline"} 
                        className="flex-1"
                        onClick={() => setAdjustAction("add")}
                      >
                        Add Funds
                      </Button>
                      <Button 
                        variant={adjustAction === "subtract" ? "destructive" : "outline"} 
                        className="flex-1"
                        onClick={() => setAdjustAction("subtract")}
                      >
                        Subtract Funds
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Balance</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant={adjustType === "available" ? "secondary" : "outline"} 
                        className="flex-1"
                        onClick={() => setAdjustType("available")}
                      >
                        Available
                      </Button>
                      <Button 
                        variant={adjustType === "invested" ? "secondary" : "outline"} 
                        className="flex-1"
                        onClick={() => setAdjustType("invested")}
                      >
                        Invested
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adj-amount">Amount (₦)</Label>
                  <Input 
                    id="adj-amount"
                    type="number"
                    placeholder="0.00"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="h-12 text-lg font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adj-reason">Reason / Note (Optional)</Label>
                  <Input 
                    id="adj-reason"
                    placeholder="e.g. Manual deposit correction"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>

                <Button className="w-full h-12 gap-2" onClick={handleAdjustBalance}>
                  <Save className="w-5 h-5" />
                  Apply Adjustment
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTx ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">Loading history...</TableCell>
                      </TableRow>
                    ) : userTransactions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 italic text-muted-foreground">No transactions found.</TableCell>
                      </TableRow>
                    ) : (
                      userTransactions?.map((tx) => (
                        <TableRow key={tx.id} className="text-xs">
                          <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
                          <TableCell className="font-bold">₦{tx.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                            }`}>
                              {tx.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tx.createdAt ? format(tx.createdAt.toDate(), "MMM dd, HH:mm") : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close Window</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    