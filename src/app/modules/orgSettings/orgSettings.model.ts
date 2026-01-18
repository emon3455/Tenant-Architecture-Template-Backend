import { model, Schema } from "mongoose";
import { IOrgSettings } from "./orgSettings.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";

const businessHourSchema = new Schema(
  {
    dow: { type: Number, min: 0, max: 6, required: true },
    opens: { type: String, required: true },
    closes: { type: String, required: true },
  },
  { _id: false, versionKey: false }
);

const orgSettingsSchema = new Schema<IOrgSettings>(
  {
    org: { type: Schema.Types.ObjectId, ref: "Org", required: true },
    branding: {
      logoUrl: String,
      primaryColor: String,
      secondaryColor: String,
      primaryTextColor: String,
      secondaryTextColor: String,
    },
    businessHours: { type: [businessHourSchema], default: [] },
    holidays: {
      type: [
        {
          date: String,
          name: String,
        },
      ],
      default: [],
    },
    timezone: { type: String, required: true, default: "UTC" },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One settings doc per org:
orgSettingsSchema.index(
  { org: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Multitenancy guard:
orgSettingsSchema.plugin(tenantScopePlugin, { orgField: "org" });

export const OrgSettings = model<IOrgSettings>(
  "OrgSettings",
  orgSettingsSchema
);
