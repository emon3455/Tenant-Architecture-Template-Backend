import { model, Schema } from "mongoose";
import { IAuthProvider, IsActive, IUser, Role, IUserFeatureAction, StorageUnit } from "./user.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";


const authProviderSchema = new Schema<IAuthProvider>({
    provider: { type: String, required: true },
    providerId: { type: String, required: true }
}, {
    versionKey: false,
    _id: false
})

// Schema for user feature action objects
const userActionSchema = new Schema<IUserFeatureAction>({
    description: { type: String, required: true },
    value: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: true }
}, { _id: false });

const subFeatureSchema = new Schema({
    name: { type: String, required: true },
    key: { type: String, required: true },
    actions: [userActionSchema]
}, { _id: false });

const featureSchema = new Schema({
    name: { type: String, required: true },
    key: { type: String, required: true },
    actions: [userActionSchema],
    subFeatures: [subFeatureSchema]
}, { _id: false });

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    password: { type: String },
    org: { 
        type: Schema.Types.ObjectId, 
        ref: "Org", 
        required: function(this: IUser) {
            // org is not required for super admin
            // return this.role !== Role.SUPER_ADMIN;
            return ![Role.SUPER_ADMIN, Role.SUPPORT_AGENT].includes(this.role as Role);
        }
    },
    role: {
        type: String,
        required: true,
        default: Role.ADMIN,
    },
    categories: [{ type: Schema.Types.ObjectId, ref: "UserCategory" }],
    hourlyRate: { type: Number, default: 0 },
    phone: { type: String },
    picture: { type: String },
    address: { type: String },
    isDeleted: { type: Boolean, default: false },
    isActive: {
        type: String,
        enum: Object.values(IsActive),
        default: IsActive.ACTIVE,
    },
    isVerified: { type: Boolean, default: false },

    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpPurpose: { type: String, default: null }, // e.g. "verify_email" | "reset_password" | "2fa"

    auths: [authProviderSchema],

    featureAccess: [featureSchema],

    isAvailable: {
      type: Boolean,
      default: true
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: false
    },
    isOrgOwner: {
      type: Boolean,
      default: false
    },
    storageUsage: {
      value: { type: Number, default: 0 },
      unit: {
        type: String,
        enum: Object.values(StorageUnit),
        default: StorageUnit.MB,
      },
    }
}, {
    timestamps: true,
    versionKey: false
})

userSchema.plugin(tenantScopePlugin, { exemptRoles: ["SUPER_ADMIN", "SUPPORT_AGENT"], orgField: "org" });

export const User = model<IUser>("User", userSchema)