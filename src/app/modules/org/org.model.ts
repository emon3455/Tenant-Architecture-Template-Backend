import { Schema, model } from "mongoose";
import { IOrg, OrgStatus, EmailProvider } from "./org.interface";

const BillingInfoSchema = new Schema(
  {
    paymentMethodId: { type: String, required: true },
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    searchLocation: { type: String },
    address: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  { _id: false }
);

// Email Template Schema
const EmailTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    htmlContent: { type: String, required: true },
    textContent: { type: String },
    variables: [{ type: String }]
  },
  { _id: false }
);

// SMTP Configuration Schema
const SMTPConfigSchema = new Schema(
  {
    host: { type: String, required: true },
    port: { type: Number, required: true, min: 1, max: 65535 },
    secure: { type: Boolean, default: false },
    auth: {
      user: { type: String, required: true },
      pass: { type: String, required: true }
    }
  },
  { _id: false }
);

// Email Configuration Schema
const EmailConfigurationSchema = new Schema(
  {
    provider: { 
      type: String, 
      enum: Object.values(EmailProvider), 
      required: true 
    },
    isActive: { type: Boolean, default: false },
    
    // Provider-specific configurations
    sendgridConfig: {
      apiKey: { type: String },
      verifiedSender: { type: String }
    },

    verificationStatus: { type: String, enum: ['verified', 'pending', 'failed'] },
    
    mailgunConfig: {
      apiKey: { type: String },
      domain: { type: String },
      region: { type: String, enum: ['US', 'EU'] }
    },
    
    smtpConfig: SMTPConfigSchema,
    
    // Organization sender information
    senderInfo: {
      fromEmail: { type: String },
      fromName: { type: String },
      replyToEmail: { type: String },
      supportEmail: { type: String }
    },
    
    // Email templates
    templates: [EmailTemplateSchema],
    
    // Email settings
    settings: {
      enableEmailTracking: { type: Boolean, default: true },
      enableClickTracking: { type: Boolean, default: true },
      enableOpenTracking: { type: Boolean, default: true },
      unsubscribeUrl: { type: String },
      footerText: { type: String }
    },
    
    // Rate limiting
    rateLimits: {
      dailyLimit: { type: Number, default: 1000 },
      hourlyLimit: { type: Number, default: 100 }
    }
  },
  { _id: false }
);

const OrgSchema = new Schema<IOrg>(
  {
    orgName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    orgEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    billingInfo: BillingInfoSchema,
    stripeCustomerId: { type: String }, 
    status: {
      type: String,
      enum: Object.values(OrgStatus),
      default: OrgStatus.ACTIVE,
      index: true,
    },
    orgPhone: {
      type: String,
      trim: true,
    },
    orgAddress: AddressSchema,
    planStartDate: { type: Date, required: true, default: Date.now },
    nextBillingDate: { type: Date, required: true },
    
    // Email configuration for automation and communication
    emailConfiguration: EmailConfigurationSchema
  },
  { timestamps: true }
);

export const Org = model<IOrg>("Org", OrgSchema);
