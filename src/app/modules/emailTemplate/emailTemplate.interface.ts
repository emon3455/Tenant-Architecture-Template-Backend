import { Types } from "mongoose";

export interface ITemplateCategory {
	_id?: Types.ObjectId;
	org: Types.ObjectId;
	name: string;
	description?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface IEmailTemplate {
	_id?: Types.ObjectId;
	org: Types.ObjectId;
	title: string;
	subject?: string;
	body: string;
	designJson: string;
	placeholders: string[];
	des?: string;
	category?: Types.ObjectId | ITemplateCategory | null;
	createdAt?: Date;
	updatedAt?: Date;
}

