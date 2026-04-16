
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { GlobalSettings } from "@/app/lib/db-schema";

const SettingsContext = createContext<GlobalSettings | null>(null);

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { firestore } = useFirebase();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    if (!firestore) return;
    const unsubscribe = onSnapshot(doc(firestore, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      }
    });
    return () => unsubscribe();
  }, [firestore]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};
