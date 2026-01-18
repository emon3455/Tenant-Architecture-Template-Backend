import { Schema, model } from "mongoose";
import { DurationUnit, IPlan } from "./plan.interface";

const PlanSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    durationUnit: {
      type: String,
      enum: Object.values(DurationUnit),
      required: true,
    },
    durationValue: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    isTrial: {
      type: Boolean,
      default: false,
      index: true,
    },
    postTrialPlan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    serial: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
  },
  { timestamps: true }
);

export const Plan = model<IPlan>("Plan", PlanSchema);
