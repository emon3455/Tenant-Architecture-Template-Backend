import { Document, Types } from "mongoose";

export interface IChannels {
  dndAllChannels: boolean;
  email: boolean;
  extMessage: boolean;
  callAndVoice: boolean;
  inboundCallsAndSms: boolean;
}

export interface IContact extends Document {
  _id: Types.ObjectId;
  org: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  profileUrl?: string;
  contactType?: string;
  tags?: string[];
  timeZone?: string;
  channels: IChannels;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContactCreate {
  org?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  profileUrl?: string;
  contactType?: string;
  timeZone?: string;
  channels?: Partial<IChannels>;
}

export interface IContactUpdate {
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  profileUrl?: string;
  contactType?: string;
  timeZone?: string;
  channels?: Partial<IChannels>;
}
