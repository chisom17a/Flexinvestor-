
"use client";

import React, { useState, useEffect } from "react";
import { doc, collection, Timestamp } from "firebase/firestore";
import { useFirebase, useDoc, setDocumentNonBlocking, addDocumentNonBlocking, useMemoFirebase } from "@/firebase";
import { GlobalSettings } from "@/app/lib/db-schema";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, ShieldAlert, Bell, Wallet, Sparkles, Plus, Trash2, Link as LinkIcon, Lock, Gift } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
  const { firestore } = useFirebase();
  const { profile: adminProfile } = useAuth();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "settings", "global");
  }, [firestore]);

  const { data: settings, isLoading } = useDoc<GlobalSettings>(settingsRef);

  const [formData, setFormData] = useState<Partial<GlobalSettings>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleToggle = (field: keyof GlobalSettings) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (field: keyof GlobalSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddButton = () => {
    const currentButtons = formData.welcomeButtons || [];
    handleInputChange("welcomeButtons", [...currentButtons, { label: "New Action", url: "https://" }]);
  };

  const handleRemoveButton = (index: number) => {
    const currentButtons = formData.welcomeButtons || [];
    const newButtons = currentButtons.filter((_, i) => i !== index);
    handleInputChange("welcomeButtons", newButtons);
  };

  const handleButtonChange = (index: number, field: "label" | "url", value: string) => {
    const currentButtons = [...(formData.welcomeButtons || [])];
    currentButtons[index] = { ...currentButtons[index], [field]: value };
    handleInputChange("welcomeButtons", currentButtons);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !adminProfile) return;

    setDocumentNonBlocking(doc(firestore, "settings", "global"), formData, { merge: true });

    addDocumentNonBlocking(collection(firestore, "admin_logs"), {
      action: "UPDATE_GLOBAL_SETTINGS",
      adminId: adminProfile.uid,
      timestamp: Timestamp.now(),
      details: "Updated global platform settings including financial controls and bonuses."
    });

    toast({
      title: "Settings Saved",
      description: "Changes have been applied to the platform instantly.",
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-headline font-bold">Global Settings</h2>
          <p className="text-muted-foreground">Configure platform-wide operational parameters</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Financial Parameters
            </CardTitle>
            <CardDescription>Limits and fees for user transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minDeposit">Min Deposit (₦)</Label>
                <Input
                  id="minDeposit"
                  type="number"
                  value={formData.minDeposit ?? ""}
                  onChange={(e) => handleInputChange("minDeposit", parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minWithdrawal">Min Withdrawal (₦)</Label>
                <Input
                  id="minWithdrawal"
                  type="number"
                  value={formData.minWithdrawal ?? ""}
                  onChange={(e) => handleInputChange("minWithdrawal", parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawalFeePercent">Withdrawal Fee (%)</Label>
                <Input
                  id="withdrawalFeePercent"
                  type="number"
                  step="0.1"
                  value={formData.withdrawalFeePercent ?? ""}
                  onChange={(e) => handleInputChange("withdrawalFeePercent", parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralPercent">Referral Bonus (%)</Label>
                <Input
                  id="referralPercent"
                  type="number"
                  step="0.1"
                  value={formData.referralPercent ?? ""}
                  onChange={(e) => handleInputChange("referralPercent", parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t mt-4">
              <Label className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent" />
                Welcome Bonus (₦)
              </Label>
              <Input
                id="welcomeBonusAmount"
                type="number"
                value={formData.welcomeBonusAmount ?? ""}
                onChange={(e) => handleInputChange("welcomeBonusAmount", parseFloat(e.target.value))}
                required
              />
              <p className="text-[10px] text-muted-foreground italic">One-time claimable gift for new users.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Platform Control
            </CardTitle>
            <CardDescription>System status and access toggles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-base">Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">Restrict user actions while performing updates</p>
              </div>
              <Switch
                checked={!!formData.maintenanceMode}
                onCheckedChange={() => handleToggle("maintenanceMode")}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-base">Allow Deposits</Label>
                <p className="text-xs text-muted-foreground">Enable or disable the deposit gateway</p>
              </div>
              <Switch
                checked={formData.allowDeposits !== false}
                onCheckedChange={() => handleToggle("allowDeposits")}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="text-base">Allow Withdrawals</Label>
                  <Lock className="w-3 h-3 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Master switch for payout requests</p>
              </div>
              <Switch
                checked={formData.allowWithdrawals !== false}
                onCheckedChange={() => handleToggle("allowWithdrawals")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Welcome Pop-up Configuration
            </CardTitle>
            <CardDescription>Message users see upon logging in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="welcomeTitle">Pop-up Title</Label>
                <Input
                  id="welcomeTitle"
                  placeholder="e.g. Welcome to FlexInvest Pro!"
                  value={formData.welcomeTitle ?? ""}
                  onChange={(e) => handleInputChange("welcomeTitle", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Pop-up Message</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="Body text..."
                  className="min-h-[120px]"
                  value={formData.welcomeMessage ?? ""}
                  onChange={(e) => handleInputChange("welcomeMessage", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Action Buttons</h4>
                  <p className="text-xs text-muted-foreground">Links to communities or support</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddButton} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Button
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.welcomeButtons?.map((btn, index) => (
                  <div key={index} className="p-4 border rounded-xl bg-card space-y-3 relative group animate-in slide-in-from-bottom-2 duration-300">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveButton(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Label</Label>
                      <Input 
                        value={btn.label} 
                        onChange={(e) => handleButtonChange(index, "label", e.target.value)}
                        placeholder="e.g. Join Community"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">URL</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input 
                          value={btn.url} 
                          onChange={(e) => handleButtonChange(index, "url", e.target.value)}
                          placeholder="https://..."
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              Global Announcement Banner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement">Announcement Text</Label>
              <Textarea
                id="announcement"
                placeholder="Message for all users..."
                className="min-h-[80px]"
                value={formData.announcement ?? ""}
                onChange={(e) => handleInputChange("announcement", e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="gap-2 px-10 font-headline">
                <Save className="w-5 h-5" />
                Save All Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
