/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
// src/lib/tenantContext.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { Types } from "mongoose";
import { Role } from "../modules/user/user.interface";

export type TenantStore = {
  userId?: Types.ObjectId | string;
  orgId?: Types.ObjectId | string;
  role?: Role | string;
  skipTenant?: boolean;
};

export const tenantALS = new AsyncLocalStorage<TenantStore>();

// Put this near the top of your middleware chain (app.ts)
export const withRequestContext = (req: any, res: any, next: any) => {
  tenantALS.run({}, next);
};

export const setTenantStore = (patch: Partial<TenantStore>) => {
  const store = tenantALS.getStore();
  if (store) Object.assign(store, patch);
};

export const getTenantStore = () => tenantALS.getStore();
