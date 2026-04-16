
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  TrendingUp, 
  History, 
  Users, 
  LogOut, 
  ShieldCheck,
  CreditCard,
  ChevronDown,
  Briefcase,
  Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase";
import { useAuth } from "@/components/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Invest", icon: TrendingUp, href: "/dashboard/invest" },
  { label: "My Investments", icon: Briefcase, href: "/dashboard/investments" },
  { label: "Transactions", icon: History, href: "/dashboard/transactions" },
  { label: "Wallet", icon: CreditCard, href: "/dashboard/wallet" },
  { label: "Bank Details", icon: Landmark, href: "/dashboard/bank-details" },
  { label: "Referrals", icon: Users, href: "/dashboard/referral" },
];

export function Navbar() {
  const pathname = usePathname();
  const { auth } = useFirebase();
  const { profile, isAdmin } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
  };

  if (!profile) return null;

  return (
    <header className="h-16 border-b bg-card sticky top-0 z-50 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-6">
        <Link href="/">
          <Logo iconClassName="w-8 h-8" textClassName="text-lg" />
        </Link>
        
        <nav className="hidden xl:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button 
                variant="ghost" 
                className={cn(
                  "h-9 px-3 gap-2",
                  pathname === item.href ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link href="/admin" className="hidden sm:block">
            <Button variant="destructive" size="sm" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Button>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-10 border-none bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                {profile.email[0].toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate hidden md:inline-block font-medium">
                {profile.username || profile.email.split('@')[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile.username}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="xl:hidden">
              {NAV_ITEMS.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-2 cursor-pointer w-full">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>

            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2 cursor-pointer w-full text-destructive">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Console</span>
                </Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={handleLogout} className="text-muted-foreground cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
