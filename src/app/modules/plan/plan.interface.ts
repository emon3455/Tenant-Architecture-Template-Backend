import { Types } from "mongoose";

export enum DurationUnit {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
  YEAR = "YEAR",
}

export interface IPlan {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  slug: string;
  durationUnit: DurationUnit;
  durationValue: number;
  price: number;
  features: string[];
  isTrial?: boolean;
  postTrialPlan?: Types.ObjectId | null;
  isActive?: boolean;
  serial?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
