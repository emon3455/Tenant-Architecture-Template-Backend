import { Schema, model } from "mongoose";
import { IPayment, PaymentStatus, PaymentType } from "./payment.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";

const paymentSchema = new Schema<IPayment>(
  {
    org: { type: Schema.Types.ObjectId, ref: "Org", required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
    description: { type: String, trim: true },
    type: { 
      type: String, 
      enum: Object.values(PaymentType),
      index: true 
    },
    transactionId: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.SUCCESS,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

paymentSchema.plugin(tenantScopePlugin, { exemptRoles: ["SUPER_ADMIN"], orgField: "org" });

export const Payment = model<IPayment>("Payment", paymentSchema);
