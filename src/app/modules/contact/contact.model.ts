import mongoose, { Schema } from "mongoose";
import { IContact } from "./contact.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";

const channelsSchema = new Schema(
  {
    dndAllChannels: {
      type: Boolean,
      default: false,
    },
    email: {
      type: Boolean,
      default: true,
    },
    extMessage: {
      type: Boolean,
      default: true,
    },
    callAndVoice: {
      type: Boolean,
      default: true,
    },
    inboundCallsAndSms: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const contactSchema = new Schema<IContact>(
  {
    org: {
      type: Schema.Types.ObjectId,
      ref: "Org",
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profileUrl: {
      type: String,
      trim: true,
    },
    contactType: {
      type: String,
      trim: true,
    },
    tags:{
      type: [String],
      default: [],
    },
    timeZone: {
      type: String,
      trim: true,
    },
    channels: {
      type: channelsSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

contactSchema.plugin(tenantScopePlugin, { exemptRoles: ["SUPER_ADMIN"], orgField: "org" });

export const Contact = mongoose.model<IContact>("Contact", contactSchema);
