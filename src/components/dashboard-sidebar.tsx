
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
  Briefcase,
  Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase";
import { useAuth } from "@/components/auth-context";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem
} from "@/components/ui/sidebar";
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

const ADMIN_NAV_ITEMS = [
  { label: "Admin Console", icon: ShieldCheck, href: "/admin" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { auth } = useFirebase();
  const { isAdmin } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="h-16 flex items-center px-4 border-b">
        <Link href="/">
          <Logo iconClassName="w-8 h-8" textClassName="text-lg" />
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="p-4 space-y-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Main Menu</p>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href}
                  className={cn(
                    "w-full h-11 transition-colors",
                    pathname === item.href ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {isAdmin && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Administration</p>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname.startsWith(item.href)}
                    className={cn(
                      "w-full h-11 transition-colors text-destructive hover:bg-destructive/10 hover:text-destructive",
                      pathname.startsWith(item.href) ? "bg-destructive/10" : ""
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full h-11 text-muted-foreground hover:bg-muted transition-colors flex items-center gap-3"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
