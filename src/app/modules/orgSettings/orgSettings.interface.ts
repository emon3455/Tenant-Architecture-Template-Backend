import { Types } from "mongoose";

export interface TBusinessHour {
  dow: number; // 0=Sun ... 6=Sat
  opens: string; // "08:00"
  closes: string; // "17:00"
}

export interface IOrgSettings {
  org: Types.ObjectId;

  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    primaryTextColor: string;
    secondaryTextColor: string;
  };

  businessHours: TBusinessHour[];
  holidays?: {
    date?: string;
    name?: string;
  }[];
  timezone: string; // IANA TZ, e.g., "America/Chicago"

  isDeleted: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}
