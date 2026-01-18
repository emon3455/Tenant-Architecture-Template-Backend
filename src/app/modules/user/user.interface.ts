import { Types } from "mongoose";
import { IFeature } from "../feature/feature.interface";

// Keep for backward compatibility and system role checking
export enum Role {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    ORG_ADMIN = "ORG_ADMIN",
    MANAGER = "MANAGER",
    CREW = "CREW",
    CLIENT = "CLIENT",
    PROJECT_MANAGER = "PROJECT_MANAGER",
    SUPPORT_AGENT = "SUPPORT_AGENT",
}

// For dynamic roles, we'll store the role key as string
export type UserRole = string;

// New action structure for user featureAccess
export interface IUserFeatureAction {
    description: string;
    value: string;
    isActive: boolean;
}

export interface IUserSubFeature {
    name: string;
    key: string;
    actions: IUserFeatureAction[];
}

export interface IUserFeature {
    name: string;
    key: string;
    actions: IUserFeatureAction[];
    subFeatures: IUserSubFeature[];
}

export interface IAuthProvider {
    provider: "google" | "credentials";
    providerId: string;
}

export enum IsActive {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    BLOCKED = "BLOCKED"
}

// Add the missing interfaces
export interface IGetAllSupportAgentsQuery {
    page?: number;
    limit?: number;
}

export interface IPaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export enum StorageUnit {
    MB = "MB",
    GB = "GB"
}

export interface IUser {
  _id?: Types.ObjectId
  org?: Types.ObjectId
  name: string;
  email: string;
  contactId?: Types.ObjectId;
  password?: string;
  phone?: string;
  picture?: string;
  address?: string;
  /**
   * Categories (references to UserCategory documents)
   */
  categories?: Types.ObjectId[];
  /**
   * Hourly rate for the user (in organization's currency units)
   */
  hourlyRate?: number;
  isDeleted?: string;
  isActive?: IsActive;
  isVerified?: boolean;
  role: UserRole; // Changed from Role enum to string
  auths: IAuthProvider[]
  otpCode?: string | null,
  otpExpiresAt?: Date | null,
  otpPurpose?: string |  null, // e.g. "verify_email" | "reset_password" | "2fa"
  featureAccess?: IUserFeature[]; // Using new structure
  isAvailable?: boolean; // Only applicable for CREW role
  hasCompletedOnboarding?: boolean; // Track if user has seen the onboarding tour
    isOrgOwner?: boolean; // New field to identify organization owner
  storageUsage?: {
    value: number;
    unit: StorageUnit;
  };
}