import { Types } from "mongoose";

export interface IUpload {
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  org: Types.ObjectId; // tenant organization
  uploadedBy: Types.ObjectId; // user who uploaded
}
