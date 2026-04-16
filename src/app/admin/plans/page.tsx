
"use client";

import React, { useState } from "react";
import { collection, query, doc, orderBy, Timestamp } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { InvestmentPlan } from "@/app/lib/db-schema";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ArrowLeft, Power, PowerOff, Coins, Clock, Wallet, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function AdminPlansPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<InvestmentPlan | null>(null);

  const plansQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "plans"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: plans, isLoading } = useCollection<InvestmentPlan>(plansQuery);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const formData = new FormData(e.currentTarget);
    const price = parseFloat(formData.get("price") as string);
    const dailyIncome = parseFloat(formData.get("dailyIncome") as string);
    const time = parseInt(formData.get("time") as string);
    const totalIncome = dailyIncome * time;
    const cashback = parseFloat(formData.get("cashback") as string) || 0;

    const planData = {
      name: formData.get("name") as string,
      price,
      dailyIncome,
      time,
      totalIncome,
      cashback,
      isActive: editingPlan ? editingPlan.isActive : true,
      createdAt: editingPlan ? editingPlan.createdAt : Timestamp.now(),
    };

    if (editingPlan) {
      updateDocumentNonBlocking(doc(firestore, "plans", editingPlan.id), planData);
      toast({ title: "Product Updated", description: `${planData.name} has been updated successfully.` });
    } else {
      addDocumentNonBlocking(collection(firestore, "plans"), planData);
      toast({ title: "Product Created", description: `${planData.name} is now available.` });
    }

    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  const toggleStatus = (plan: InvestmentPlan) => {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, "plans", plan.id), {
      isActive: !plan.isActive
    });
  };

  const deletePlan = (plan: InvestmentPlan) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "plans", plan.id));
    toast({ variant: "destructive", title: "Product Deleted" });
    setIsDeleteDialogOpen(false);
    setPlanToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-headline font-bold">Investment Products</h2>
            <p className="text-muted-foreground">Manage products for user purchase</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPlan(null)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Product" : "Create New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" defaultValue={editingPlan?.name} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₦)</Label>
                  <Input id="price" name="price" type="number" defaultValue={editingPlan?.price} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dailyIncome">Daily Income (₦)</Label>
                  <Input id="dailyIncome" name="dailyIncome" type="number" step="0.1" defaultValue={editingPlan?.dailyIncome} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Time (Days)</Label>
                  <Input id="time" name="time" type="number" defaultValue={editingPlan?.time} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashback">Cashback (₦)</Label>
                  <Input id="cashback" name="cashback" type="number" defaultValue={editingPlan?.cashback || 0} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-11">
                  {editingPlan ? "Update Product" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" /> Are you sure?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              This action cannot be undone. This will permanently delete the
              <strong className="mx-1">{planToDelete?.name}</strong>
              product.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => planToDelete && deletePlan(planToDelete)}>Delete Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="col-span-full text-center py-20 text-muted-foreground">Loading products...</p>
        ) : plans?.length === 0 ? (
          <p className="col-span-full text-center py-20 text-muted-foreground">No products created yet.</p>
        ) : (
          plans?.map((plan) => (
            <Card key={plan.id} className={plan.isActive ? "border-none shadow-sm" : "opacity-60 grayscale"}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-headline">{plan.name}</CardTitle>
                <Badge variant={plan.isActive ? "default" : "outline"}>
                  {plan.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="w-4 h-4" />
                    <span>Price:</span>
                  </div>
                  <span className="font-black text-primary">₦{plan.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="w-4 h-4 text-emerald-500" />
                    <span>Daily:</span>
                  </div>
                  <span className="font-bold text-emerald-600">₦{plan.dailyIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Time:</span>
                  </div>
                  <span className="font-bold">{plan.time} Days</span>
                </div>
                <div className="pt-2 border-t mt-2">
                   <div className="flex justify-between text-xs font-bold text-muted-foreground">
                     <span>Total Income: ₦{plan.totalIncome.toLocaleString()}</span>
                     {plan.cashback > 0 && <span className="text-accent">Cashback: ₦{plan.cashback.toLocaleString()}</span>}
                   </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingPlan(plan); setIsDialogOpen(true); }}>
                  <Edit className="w-3 h-3 mr-2" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleStatus(plan)}>
                  {plan.isActive ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { setPlanToDelete(plan); setIsDeleteDialogOpen(true); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
