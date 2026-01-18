import { Types } from "mongoose";

export enum OrgStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
  INACTIVE = "INACTIVE",
  PENDING = "PENDING",
}

export enum EmailProvider {
  SENDGRID = "SENDGRID",
  MAILGUN = "MAILGUN",
  SMTP = "SMTP"
}

export type VerificationStatus = "verified" | "pending" | "failed";

export interface ISMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface IEmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[]; // List of available template variables
}

export interface IEmailConfiguration {
  provider: EmailProvider;
  isActive: boolean;
  
  // Provider-specific configurations
  sendgridConfig?: {
    apiKey: string;
    verifiedSender: string;
  };
  verificationStatus?: VerificationStatus;
  mailgunConfig?: {
    apiKey: string;
    domain: string;
    region?: 'US' | 'EU'; // Default US
  };
  
  smtpConfig?: ISMTPConfig;
  
  // Organization sender information
  senderInfo?: {
    fromEmail?: string;
    fromName?: string;
    replyToEmail?: string;
    supportEmail?: string;
  };
  
  // Email templates for this organization
  templates: IEmailTemplate[];
  
  // Email settings
  settings: {
    enableEmailTracking: boolean;
    enableClickTracking: boolean;
    enableOpenTracking: boolean;
    unsubscribeUrl?: string;
    footerText?: string;
  };
  
  // Rate limiting
  rateLimits?: {
    dailyLimit: number;
    hourlyLimit: number;
  };
}

export interface IBillingInfo {
  paymentMethodId:string; 
}
export interface IAddress {
  searchLocation?: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

export interface IOrg {
  _id?: Types.ObjectId;
  orgName: string;       
  orgEmail: string;         
  plan: Types.ObjectId;       
  status?: OrgStatus;          
  orgPhone?: string;     
  orgAddress?: IAddress;   
  billingInfo?: IBillingInfo;   
  stripeCustomerId?: string;
  planStartDate?: Date;
  nextBillingDate?: Date;
  
  // Email configuration for automation and communication
  emailConfiguration?: IEmailConfiguration;
  
  createdAt?: Date;
  updatedAt?: Date;
}
