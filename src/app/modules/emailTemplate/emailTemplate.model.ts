import { Schema, model, models } from "mongoose";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";
import { IEmailTemplate, ITemplateCategory } from "./emailTemplate.interface";

const templateCategorySchema = new Schema<ITemplateCategory>(
	{
		org: { type: Schema.Types.ObjectId, ref: "Org"},
		name: { type: String, required: true, trim: true },
		description: { type: String, trim: true },
	},
	{ timestamps: true }
);

// Unique category name per org
templateCategorySchema.index({ org: 1, name: 1 }, { unique: true });
templateCategorySchema.plugin(tenantScopePlugin, { orgField: "org", exemptRoles: ["SUPER_ADMIN"] });

const emailTemplateSchema = new Schema<IEmailTemplate>(
	{
		org: { type: Schema.Types.ObjectId, ref: "Org"},
		title: { type: String, required: true, trim: true },
		subject: { type: String, trim: true },
		body: { type: String, required: true },
		designJson: { type: String, required: true },
		placeholders: { type: [String], default: [] },
		des: { type: String, trim: true },
		category: { type: Schema.Types.ObjectId, ref: "TemplateCategory", default: null },
	},
	{ timestamps: true }
);

emailTemplateSchema.index({ org: 1, title: 1 });
emailTemplateSchema.index({ org: 1, category: 1 });
emailTemplateSchema.plugin(tenantScopePlugin, { orgField: "org", exemptRoles: ["SUPER_ADMIN"] });

export const TemplateCategory = (models.TemplateCategory as any) || model<ITemplateCategory>("TemplateCategory", templateCategorySchema);
// Use a distinct model name to avoid conflict with existing Email module's EmailTemplate
export const OrgEmailTemplate = (models.OrgEmailTemplate as any) || model<IEmailTemplate>("OrgEmailTemplate", emailTemplateSchema);

