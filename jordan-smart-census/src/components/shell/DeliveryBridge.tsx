"use client";

import { useEffect } from "react";
import { startShared, useDeliveryStore } from "@/delivery/store";
import { useConnectors } from "@/store/connectors";

/** Loads the local delivery workspace and, on the hosted page, connects the shared one. */
export function DeliveryBridge() {
  useEffect(() => {
    void useDeliveryStore.persist.rehydrate();
    void useConnectors.persist.rehydrate();
    void startShared();
  }, []);
  return null;
}
