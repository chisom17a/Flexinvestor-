
"use client";

import React, { useState } from "react";
import { doc, arrayUnion, Timestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth-context";
import { useFirebase, updateDocumentNonBlocking } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Plus, ShieldCheck, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BankDetailsPage() {
  const { profile } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !firestore) return;

    if ((profile.bankAccounts?.length || 0) >= 5) {
      toast({
        variant: "destructive",
        title: "Limit Reached",
        description: "You can only add a maximum of 5 bank accounts.",
      });
      return;
    }

    setLoading(true);

    const newAccount = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      accountName: formData.accountName,
      createdAt: Timestamp.now(),
    };

    updateDocumentNonBlocking(doc(firestore, "users", profile.uid), {
      bankAccounts: arrayUnion(newAccount)
    });

    toast({
      title: "Account Added",
      description: "Your new bank account has been saved. Note: It cannot be edited.",
    });
    
    setFormData({ bankName: "", accountNumber: "", accountName: "" });
    setLoading(false);
  };

  if (!profile) return null;

  const accountsCount = profile.bankAccounts?.length || 0;
  const isLimitReached = accountsCount >= 5;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-3xl font-headline font-bold">Bank Accounts</h2>
        <p className="text-muted-foreground">Manage your payout accounts (Max 5)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="border-none shadow-xl overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Plus className="w-6 h-6" />
                </div>
                <Badge variant="secondary">{accountsCount} / 5 Used</Badge>
              </div>
              <CardTitle className="font-headline text-2xl mt-4">Add New Account</CardTitle>
              <CardDescription>
                Once added, an account cannot be edited for security reasons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="e.g. First Bank, GTBank"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    required
                    disabled={isLimitReached || loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="10-digit number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    required
                    maxLength={10}
                    disabled={isLimitReached || loading}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Full name on account"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    required
                    disabled={isLimitReached || loading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-headline gap-2" 
                  disabled={isLimitReached || loading}
                >
                  {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isLimitReached ? "Limit Reached" : loading ? "Adding..." : "Add Bank Account"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="bg-muted/30 p-6 rounded-2xl border border-dashed flex gap-4 items-start">
            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-bold">Security Policy</p>
              <p className="text-muted-foreground italic">
                To prevent unauthorized changes, bank details are permanent once saved. If you made a mistake, please contact support.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-headline font-bold text-xl flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Saved Accounts
          </h3>
          
          <div className="space-y-4">
            {!profile.bankAccounts || profile.bankAccounts.length === 0 ? (
              <div className="p-12 text-center bg-card rounded-2xl border border-dashed text-muted-foreground italic">
                No accounts added yet.
              </div>
            ) : (
              profile.bankAccounts.map((account) => (
                <Card key={account.id} className="border-none shadow-md relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Landmark className="w-12 h-12" />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">{account.bankName}</p>
                        <h4 className="text-lg font-bold font-mono">{account.accountNumber}</h4>
                        <p className="text-sm text-muted-foreground">{account.accountName}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
