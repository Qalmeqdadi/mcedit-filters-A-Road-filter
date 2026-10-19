"use client";

import { useEffect } from "react";
import { startShared, useDeliveryStore } from "@/delivery/store";
import { useConnectors } from "@/store/connectors";
import { useRequests } from "@/store/requests";

/** Loads the local delivery workspace and, on the hosted page, connects the shared one. */
export function DeliveryBridge() {
  useEffect(() => {
    void useDeliveryStore.persist.rehydrate();
    void useConnectors.persist.rehydrate();
    void useRequests.persist.rehydrate();
    void startShared();
  }, []);
  return null;
}
