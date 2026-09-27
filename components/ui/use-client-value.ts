"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * A value only the browser can know (local time, localStorage). The server render and hydration use
 * `serverValue`; the browser value is read afterwards without a mismatch. `read` must return a primitive.
 */
export function useClientValue<T extends string | number | boolean | null>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscription, read, () => serverValue);
}
