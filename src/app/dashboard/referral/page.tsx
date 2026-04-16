
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Users, Gift, Share2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReferralPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Use referralCode instead of username for the link
  const referralLink = profile && origin ? `${origin}/register?ref=${profile.referralCode}` : "";

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard.",
    });
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/20 text-accent rounded-full mb-2">
          <Gift className="w-10 h-10" />
        </div>
        <h2 className="text-4xl font-headline font-bold">Share the Wealth</h2>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          Invite your friends to FlexInvest Pro and earn bonuses on their successful deposits.
        </p>
      </div>

      <Card className="border-none shadow-xl bg-primary text-white overflow-hidden">
        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-headline font-bold">Your Referral Link</h3>
                <p className="text-white/70">Share this link to track your referrals automatically.</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  readOnly 
                  value={referralLink} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white h-12"
                />
                <Button variant="secondary" size="icon" className="shrink-0 h-12 w-12" onClick={copyToClipboard}>
                  <Copy className="w-5 h-5" />
                </Button>
              </div>
              <div className="pt-2">
                <p className="text-xs text-white/50 uppercase font-bold tracking-widest">Your Code: {profile.referralCode}</p>
              </div>
            </div>
            <div className="bg-white/10 p-6 rounded-2xl flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-white/60 text-sm font-semibold uppercase tracking-wider">Total Referrals</p>
                <p className="text-4xl font-headline font-bold">{profile.referralCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: "Step 1", desc: "Share your unique referral link or code with friends.", icon: Share2 },
          { title: "Step 2", desc: "They register using your link and choose an investment plan.", icon: Users },
          { title: "Step 3", desc: "You get a bonus credited directly to your balance on their deposits.", icon: DollarSign },
        ].map((step, i) => (
          <Card key={i} className="border-none shadow-sm text-center p-6 bg-card">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
              <step.icon className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-headline font-bold text-lg mb-2">{step.title}</h4>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
