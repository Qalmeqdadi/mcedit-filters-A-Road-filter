"use client";

import { useEffect } from "react";
import { startShared, useDeliveryStore } from "@/delivery/store";

/** Loads the local delivery workspace and, on the hosted page, connects the shared one. */
export function DeliveryBridge() {
  useEffect(() => {
    void useDeliveryStore.persist.rehydrate();
    void startShared();
  }, []);
  return null;
}
