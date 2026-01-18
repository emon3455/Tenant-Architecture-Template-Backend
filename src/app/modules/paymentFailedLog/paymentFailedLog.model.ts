import { Schema, model } from "mongoose";
import { 
  IPaymentFailedLog, 
  PaymentFailureReason, 
  PaymentFailureSource 
} from "./paymentFailedLog.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";

const paymentFailedLogSchema = new Schema<IPaymentFailedLog>(
  {
    org: { 
      type: Schema.Types.ObjectId, 
      ref: "Org", 
      required: true, 
      index: true 
    },
    user: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      index: true 
    },
    source: {
      type: String,
      enum: Object.values(PaymentFailureSource),
      required: true,
      index: true,
    },
    failureReason: {
      type: String,
      enum: Object.values(PaymentFailureReason),
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    paymentMethodId: {
      type: String,
      index: true,
    },
    transactionId: {
      type: String,
      index: true,
    },
    stripeErrorCode: {
      type: String,
    },
    stripeErrorMessage: {
      type: String,
    },
    errorDetails: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Apply tenant scope plugin
paymentFailedLogSchema.plugin(tenantScopePlugin, { 
  exemptRoles: ["SUPER_ADMIN"], 
  orgField: "org" 
});

// Compound indexes for common queries
paymentFailedLogSchema.index({ org: 1, createdAt: -1 });
paymentFailedLogSchema.index({ org: 1, isResolved: 1, createdAt: -1 });
paymentFailedLogSchema.index({ org: 1, source: 1, createdAt: -1 });
paymentFailedLogSchema.index({ org: 1, failureReason: 1, createdAt: -1 });
paymentFailedLogSchema.index({ createdAt: -1 });

// Automatically set resolvedAt when isResolved is set to true
paymentFailedLogSchema.pre("save", function (next) {
  if (this.isModified("isResolved") && this.isResolved && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

export const PaymentFailedLog = model<IPaymentFailedLog>(
  "PaymentFailedLog", 
  paymentFailedLogSchema
);
