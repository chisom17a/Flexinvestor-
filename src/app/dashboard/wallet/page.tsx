
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { useSettings } from "@/components/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Info, 
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  TrendingUp,
  History,
  Lock,
  Landmark,
  AlertTriangle,
  Users as UsersIcon
} from "lucide-react";
import { collection, query, where, orderBy, limit, Timestamp, doc, increment } from "firebase/firestore";
import { useCollection, useMemoFirebase, useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { TransactionRecord } from "@/app/lib/db-schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PaystackButton } from "react-paystack";

export default function WalletPage() {
  const { profile } = useAuth();
  const { firestore } = useFirebase();
  const settings = useSettings();
  const { toast } = useToast();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore || !profile) return null;
    return query(
      collection(firestore, "transactions"),
      where("userId", "==", profile.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [firestore, profile]);

  const { data: transactions, isLoading: loadingTx } = useCollection<TransactionRecord>(transactionsQuery);

  const handlePaystackSuccess = (reference: any, amount: number) => {
    if (!profile || !firestore) return;

    setLoading(true);
    
    const depositRef = reference.reference || `PAY-${Math.random().toString(36).substring(7).toUpperCase()}`;

    addDocumentNonBlocking(collection(firestore, "transactions"), {
      userId: profile.uid,
      type: "deposit",
      amount: amount,
      status: "approved",
      createdAt: Timestamp.now(),
      reference: depositRef,
      metadata: { gateway: "paystack", paystackRef: reference.reference || "N/A" }
    });

    updateDocumentNonBlocking(doc(firestore, "users", profile.uid), {
      availableBalance: increment(amount),
      hasDeposited: true // Mark as having deposited
    });

    toast({
      title: "Deposit Successful",
      description: `₦${amount.toLocaleString()} has been added to your balance.`,
    });
    
    setDepositAmount("");
    setLoading(false);
  };

  const handleWithdraw = () => {
    if (!profile || !firestore || !settings || !withdrawAmount || !selectedAccountId) return;
    
    // Check Withdrawal Constraints
    if (!profile.hasDeposited) {
      toast({ variant: "destructive", title: "Action Required", description: "You must make at least one deposit to unlock withdrawals." });
      return;
    }
    if (profile.referralCount < 1) {
      toast({ variant: "destructive", title: "Action Required", description: "You must have at least one referral to unlock withdrawals." });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const selectedAccount = profile.bankAccounts?.find(a => a.id === selectedAccountId);

    if (!selectedAccount) return;

    if (isNaN(amount) || amount < settings.minWithdrawal) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: `Minimum withdrawal is ₦${settings.minWithdrawal.toLocaleString()}.`,
      });
      return;
    }

    if (amount > profile.availableBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "You don't have enough funds to withdraw this amount.",
      });
      return;
    }

    setLoading(true);
    const fee = (amount * settings.withdrawalFeePercent) / 100;
    
    addDocumentNonBlocking(collection(firestore, "transactions"), {
      userId: profile.uid,
      type: "withdrawal",
      amount: amount,
      status: "pending",
      createdAt: Timestamp.now(),
      reference: `WTH-${Math.random().toString(36).substring(7).toUpperCase()}`,
      metadata: { 
        fee, 
        netAmount: amount - fee,
        bankDetails: {
          bank: selectedAccount.bankName,
          account: selectedAccount.accountNumber,
          name: selectedAccount.accountName
        }
      }
    });

    updateDocumentNonBlocking(doc(firestore, "users", profile.uid), {
      availableBalance: increment(-amount)
    });

    toast({
      title: "Withdrawal Requested",
      description: `Your withdrawal of ₦${amount.toLocaleString()} is pending approval.`,
    });
    
    setWithdrawAmount("");
    setLoading(false);
  };

  if (!profile) return null;

  const depositNum = parseFloat(depositAmount) || 0;
  const isDepositValid = settings?.minDeposit ? depositNum >= settings.minDeposit : depositNum > 0;
  
  const paystackProps = {
    email: profile.email,
    amount: Math.floor(depositNum * 100),
    publicKey: "pk_live_e2bee25e1d29c785e92734435801bd495f5348f5",
    text: `Deposit ₦${depositNum.toLocaleString()}`,
    onSuccess: (reference: any) => handlePaystackSuccess(reference, depositNum),
    onClose: () => toast({ title: "Payment Closed", description: "The payment window was closed." }),
  };

  const isWithdrawalDisabled = settings?.allowWithdrawals === false;
  const hasBankDetails = profile.bankAccounts && profile.bankAccounts.length > 0;
  
  // Withdrawal eligibility
  const isEligible = profile.hasDeposited && profile.referralCount >= 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-headline font-bold text-foreground">My Wallet</h2>
          <p className="text-muted-foreground">Manage your funds and track financial movements</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                className="gap-2 h-11" 
                disabled={settings?.allowDeposits === false}
              >
                <ArrowUpCircle className="w-5 h-5" />
                Deposit Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl text-primary">Deposit Funds</DialogTitle>
                <DialogDescription>
                  Enter an amount to fund your account instantly via Paystack.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="deposit-amount">Amount (₦)</Label>
                    {settings?.minDeposit && (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Min: ₦{settings.minDeposit.toLocaleString()}</span>
                    )}
                  </div>
                  <Input 
                    id="deposit-amount"
                    type="number" 
                    placeholder="Enter amount" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="h-12 text-lg font-medium"
                  />
                </div>
                <div className="p-4 bg-muted/50 border rounded-xl flex gap-3 text-sm text-muted-foreground">
                  <Info className="w-5 h-5 shrink-0 text-primary" />
                  <p>Payments are processed securely. Your balance will be updated automatically upon success.</p>
                </div>
              </div>
              <DialogFooter>
                {isDepositValid ? (
                  <PaystackButton 
                    {...paystackProps} 
                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-headline font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pay with Paystack
                  </PaystackButton>
                ) : (
                  <Button className="w-full h-12 text-lg font-headline" disabled>
                    {depositNum > 0 ? `Minimum ₦${settings?.minDeposit?.toLocaleString()}` : "Enter Amount"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 h-11"
                disabled={isWithdrawalDisabled}
              >
                {isWithdrawalDisabled ? <Lock className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                {isWithdrawalDisabled ? "Withdrawal Closed" : "Withdraw"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              {!hasBankDetails ? (
                <div className="py-6 space-y-6 text-center">
                  <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <DialogTitle className="font-headline text-2xl">Bank Details Required</DialogTitle>
                    <DialogDescription>
                      You need to set up at least one payout account before you can request a withdrawal.
                    </DialogDescription>
                  </div>
                  <Button asChild className="w-full h-12 text-lg">
                    <Link href="/dashboard/bank-details">
                      Go to Bank Details
                    </Link>
                  </Button>
                </div>
              ) : !isEligible ? (
                <div className="py-6 space-y-6 text-center">
                  <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-4">
                    <DialogTitle className="font-headline text-2xl">Conditions Not Met</DialogTitle>
                    <DialogDescription>
                      To withdraw, you must complete the following requirements:
                    </DialogDescription>
                    <div className="space-y-2 text-left">
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
                         {profile.hasDeposited ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                         <span className={cn("text-xs font-bold", profile.hasDeposited ? "text-emerald-700" : "text-muted-foreground")}>At least 1 Successful Deposit</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
                         {profile.referralCount >= 1 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                         <span className={cn("text-xs font-bold", profile.referralCount >= 1 ? "text-emerald-700" : "text-muted-foreground")}>At least 1 Referral</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <Button asChild variant="outline" className="gap-2">
                       <Link href="/dashboard/invest">
                         <CreditCard className="w-4 h-4" /> Deposit
                       </Link>
                     </Button>
                     <Button asChild variant="outline" className="gap-2">
                       <Link href="/dashboard/referral">
                         <UsersIcon className="w-4 h-4" /> Refer
                       </Link>
                     </Button>
                  </div>
                </div>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="font-headline text-2xl text-destructive">Withdraw Funds</DialogTitle>
                    <DialogDescription>
                      Transfer funds to one of your saved bank accounts.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Payout Account</Label>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choose a bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {profile.bankAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bankName} · {account.accountNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="withdraw-amount">Amount (₦)</Label>
                      <Input 
                        id="withdraw-amount"
                        type="number" 
                        placeholder={`Min: ₦${settings?.minWithdrawal.toLocaleString()}`} 
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="h-12 text-lg font-medium"
                      />
                    </div>
                    <div className="space-y-2 p-4 bg-muted/50 border rounded-xl text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available Balance:</span>
                        <span className="font-bold">₦{profile.availableBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Withdrawal Fee ({settings?.withdrawalFeePercent}%):</span>
                        <span className="text-destructive font-medium">
                          -₦{withdrawAmount ? ((parseFloat(withdrawAmount) * (settings?.withdrawalFeePercent || 0)) / 100).toLocaleString() : "0"}
                        </span>
                      </div>
                      <div className="pt-2 border-t mt-2 flex justify-between font-bold text-base">
                        <span>You Receive:</span>
                        <span className="text-primary">
                          ₦{withdrawAmount ? (parseFloat(withdrawAmount) - ((parseFloat(withdrawAmount) * (settings?.withdrawalFeePercent || 0)) / 100)).toLocaleString() : "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full h-12 text-lg font-headline" 
                      onClick={handleWithdraw} 
                      disabled={loading || !withdrawAmount || !selectedAccountId || parseFloat(withdrawAmount) > profile.availableBalance}
                    >
                      {loading ? "Processing..." : "Submit Withdrawal"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-primary text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-white/80 font-medium text-xs uppercase tracking-widest flex items-center gap-2">
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="text-4xl md:text-5xl font-headline font-bold">
                ₦{profile.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Total Earnings</p>
                  <p className="text-xl font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    ₦{profile.totalEarnings.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Invested Funds</p>
                  <p className="text-xl font-bold">₦{profile.investedBalance.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-headline flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Withdrawal Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Min Deposit Status:</span>
                  <Badge variant={profile.hasDeposited ? "secondary" : "outline"} className={profile.hasDeposited ? "bg-emerald-100 text-emerald-700 border-none" : ""}>
                    {profile.hasDeposited ? "Completed" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Referral Requirement:</span>
                  <Badge variant={profile.referralCount >= 1 ? "secondary" : "outline"} className={profile.referralCount >= 1 ? "bg-emerald-100 text-emerald-700 border-none" : ""}>
                    {profile.referralCount >= 1 ? "Completed" : "0 / 1"}
                  </Badge>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic leading-tight">
                * Both conditions must be met before you can request your first payout.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-6 py-4">
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Wallet Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-3">Transaction</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {loadingTx ? (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-muted-foreground animate-pulse font-medium">Fetching activity...</td></tr>
                  ) : transactions?.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-muted-foreground italic">No wallet activity recorded yet.</td></tr>
                  ) : (
                    transactions?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                              ["deposit", "referral_bonus", "daily_earnings", "welcome_bonus"].includes(tx.type) ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                            )}>
                              {["deposit", "referral_bonus", "daily_earnings", "welcome_bonus"].includes(tx.type) ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="font-bold capitalize">{tx.type.replace('_', ' ')}</span>
                              <p className="text-[10px] text-muted-foreground font-mono">{tx.reference.substring(0, 12)}</p>
                            </div>
                          </div>
                        </td>
                        <td className={cn(
                          "px-6 py-4 font-bold text-base",
                          ["deposit", "referral_bonus", "daily_earnings", "welcome_bonus"].includes(tx.type) ? "text-emerald-500" : "text-destructive"
                        )}>
                          {["deposit", "referral_bonus", "daily_earnings", "welcome_bonus"].includes(tx.type) ? "+" : "-"}₦{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {tx.status === "approved" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            {tx.status === "pending" && <Clock className="w-3.5 h-3.5 text-orange-500" />}
                            {tx.status === "rejected" && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-tight",
                              tx.status === "approved" ? "text-emerald-600" : 
                              tx.status === "pending" ? "text-orange-600" : "text-destructive"
                            )}>
                              {tx.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">
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
    </div>
  );
}
