import { Schema, model } from "mongoose";
import { IUpload } from "./upload.interface";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";

const uploadSchema = new Schema<IUpload>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    org: { type: Schema.Types.ObjectId, ref: "Org", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 🔑 Enforce tenant scope
uploadSchema.plugin(tenantScopePlugin, { orgField: "org" });

export const Upload = model<IUpload>("Upload", uploadSchema);
