
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp, collection, query, where, getDocs, limit, updateDoc, increment } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/logo";
import { User, Lock, UserPlus, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const { auth, firestore: db } = useFirebase();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlReferralCode = searchParams.get("ref");
  const { toast } = useToast();

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    async function checkReferrer() {
      if (!urlReferralCode || !db) return;
      try {
        const refQuery = query(collection(db, "users"), where("referralCode", "==", urlReferralCode.toUpperCase()), limit(1));
        const refSnap = await getDocs(refQuery);
        if (!refSnap.empty) {
          setReferrerName(refSnap.docs[0].data().username);
        }
      } catch (e) {
        console.error("Error checking referrer", e);
      }
    }
    checkReferrer();
  }, [urlReferralCode, db]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords mismatch",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (username.length < 3) {
      toast({
        variant: "destructive",
        title: "Username too short",
        description: "Username must be at least 3 characters long.",
      });
      return;
    }

    setLoading(true);

    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(1));
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        throw new Error("Username is already taken. Please choose another one.");
      }

      let finalReferredBy = null;
      let referrerDocId = null;
      const codeToProcess = urlReferralCode || referralInput;

      if (codeToProcess) {
        const refQuery = query(collection(db, "users"), where("referralCode", "==", codeToProcess.toUpperCase()), limit(1));
        const refSnap = await getDocs(refQuery);
        
        if (!refSnap.empty) {
          const refDoc = refSnap.docs[0];
          finalReferredBy = refDoc.data().referralCode;
          referrerDocId = refDoc.id;
        } else {
          setReferralInput("");
          throw new Error("Invalid referral code. Please check and try again or leave it blank.");
        }
      }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      const userProfile = {
        uid: user.uid,
        email: user.email,
        username: username.toLowerCase(),
        role: "user",
        createdAt: Timestamp.now(),
        availableBalance: 0,
        investedBalance: 0,
        referralCode: generateReferralCode(),
        referredBy: finalReferredBy,
        referralCount: 0,
        totalEarnings: 0,
        isSuspended: false,
        hasDeposited: false,
        welcomeBonusClaimed: false,
      };

      await setDoc(doc(db, "users", user.uid), userProfile);
      
      if (referrerDocId) {
        await updateDoc(doc(db, "users", referrerDocId), {
          referralCount: increment(1)
        });
      }
      
      toast({
        title: "Account created!",
        description: `Welcome to FlexInvest Pro, ${username}!`,
      });
      
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <Link href="/">
            <Logo iconClassName="w-14 h-14" textClassName="text-3xl" />
          </Link>
          <p className="text-muted-foreground">Start your investment journey today</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline">Create Account</CardTitle>
            <CardDescription>Enter your details to register</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="username" 
                    type="text" 
                    placeholder="johndoe" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-11 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
              </div>

              {urlReferralCode ? (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Referred By</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-headline font-bold text-primary flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {referrerName || urlReferralCode}
                    </p>
                    {referrerName && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="referralInput">Referral Code (Optional)</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="referralInput" 
                      type="text" 
                      placeholder="Enter referral code" 
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value)}
                      className="h-11 pl-10 uppercase"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-lg font-headline" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
