import { model, Schema, Types } from "mongoose";
import { ILog } from "./log.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";

const logSchema = new Schema<ILog>(
  {
    org: {  
      type: Schema.Types.ObjectId,
      ref: "Org",
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    details: {
      type: String,
      default: "No additional details provided",
    },
  },
  {
    timestamps: true,
  }
);

// Apply tenant scope plugin
logSchema.plugin(tenantScopePlugin, { 
  exemptRoles: ["SUPER_ADMIN"], 
  orgField: "org" 
});

// Indexes
logSchema.index({ org: 1, user: 1, createdAt: -1 });
logSchema.index({ org: 1, action: 1, createdAt: -1 });
logSchema.index({ createdAt: -1 });

export const Log = model<ILog>("Log", logSchema);