/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
// src/db/plugins/tenantScope.plugin.ts
import type { Aggregate, Query, Schema } from "mongoose";
import { Types } from "mongoose";
import { tenantALS } from "../lib/tenantContext";

type TenantScopeOptions = {
  orgField?: string;                // defaults to 'org'
  exemptRoles?: string[];           // roles that can see all (e.g., SUPER_ADMIN)
};

type AnyQuery = Query<any, any, any, any>;
type AnyAggregate = Aggregate<any>;

export function tenantScopePlugin(
  schema: Schema,
  { orgField = "org", exemptRoles = ["SUPER_ADMIN"] }: TenantScopeOptions = {}
) {
  // Skip if schema has no org field (e.g., Org itself)
  if (!schema.path(orgField)) return;

  // Should this query be scoped?
  function shouldScope(q: AnyQuery | AnyAggregate | undefined) {
    const store = tenantALS.getStore();
    if (!store) return false;
    // Query: q as AnyQuery might have options
    const opts: { skipTenant?: boolean } | undefined =
      (q && (q as any).options) || (q && (q as AnyAggregate).options);

    if (opts?.skipTenant) return false;
    if (store.skipTenant) return false;
    if (store.role && exemptRoles.includes(store.role as string)) return false;
    return !!store.orgId;
  }

  // Build { orgField: ObjectId(...) }
  function orgMatch() {
    const store = tenantALS.getStore();
    const raw = store?.orgId;
    if (!raw) return {};
    const oid = typeof raw === "string" ? new Types.ObjectId(raw) : raw;
    return { [orgField]: oid };
  }

  // Inject match into standard query ops
  ([
    "count",
    "countDocuments",
    "estimatedDocumentCount",
    "find",
    "findOne",
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
    "deleteOne",
    "deleteMany",
  ] as const).forEach((op) => {
    schema.pre(op as any, function (this: AnyQuery, next) {
      if (!shouldScope(this)) return next();

      const match = orgMatch();
      const existing = this.getQuery() || {};
      if ((existing as any)[orgField] == null) {
        this.setQuery({ ...existing, ...match });
      }
      next();
    });
  });

  // Aggregate pipelines: unshift a $match if not already present
  schema.pre("aggregate", function (this: AnyAggregate, next) {
    if (!shouldScope(this)) return next();

    const pipeline = this.pipeline(); // returns any[]
    const alreadyMatched = pipeline.some(
      (stage: any) =>
        stage?.$match && Object.prototype.hasOwnProperty.call(stage.$match, orgField)
    );
    if (!alreadyMatched) {
      pipeline.unshift({ $match: orgMatch() });
    }
    next();
  });

  // On create/save: ensure org is set before validation
  schema.pre("validate", function (this: any, next) {
    const store = tenantALS.getStore();
    if (store?.orgId && !this.get?.(orgField)) {
      this.set?.(orgField, store.orgId);
    }
    next();
  });

  // Add a query helper to explicitly opt out when necessary
  (schema.query as any).withoutTenant = function (this: AnyQuery) {
    this.setOptions({ skipTenant: true });
    return this;
  };
}
