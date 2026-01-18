/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status-codes";
import { Types } from "mongoose";
import AppError from "../../errorHelpers/AppError";
import { IGenericResponse } from "../../interfaces/common";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { extractAndReplaceBase64Images } from "../../utils/base64ToImageConverter";
import { OrgEmailTemplate, TemplateCategory } from "./emailTemplate.model";
import { IEmailTemplate } from "./emailTemplate.interface";
import EmailService from "../email/email.service";
import { getTenantStore } from "../../lib/tenantContext";
import { Role } from "../user/user.interface";
import { Org } from "../org/org.model";

// Helper to normalize values to ObjectId or null and centralize validation
function toObjectId(value?: string | Types.ObjectId | null): Types.ObjectId | null {
	if (value == null) return null;
	if (!Types.ObjectId.isValid(String(value))) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid ObjectId");
	}
	return new Types.ObjectId(String(value));
}

function extractPlaceholders(html: string): string[] {
	const regex = /\{\{\s*([\w.]+)\s*\}\}/g;
	const set = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = regex.exec(html)) !== null) {
		set.add(m[1]);
	}
	return Array.from(set);
}

// function findMissingPlaceholders(existing: string[], next: string[]): string[] {
// 	const nextSet = new Set(next);
// 	return existing.filter((p) => !nextSet.has(p));
// }

const ensureValidCategory = async (
	category?: string | null,
	opts?: { targetOrgId?: Types.ObjectId | string | null; allowAnyOrg?: boolean }
) => {
	if (!category) return null;
	if (!Types.ObjectId.isValid(category)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid category ID");
	}
	// If caller allows any org (e.g., SUPER_ADMIN), accept any existing category regardless of org
	if (opts?.allowAnyOrg) {
		const catAny = await TemplateCategory.findById(category).withoutTenant();
		if (!catAny) throw new AppError(httpStatus.NOT_FOUND, "Category not found");
		return catAny._id;
	}
	// Otherwise, allow using either a global category (org: null or missing) or the target org's category
	// Skip tenant scoping explicitly so we can enforce our own org visibility
	const targetOrgId = toObjectId(opts?.targetOrgId);
	const cat = await TemplateCategory.findOne({
		_id: category,
		$or: [
			{ org: targetOrgId },
			{ org: null },
			{ org: { $exists: false } }, // legacy global category without explicit null
		],
	}).withoutTenant();
	if (!cat) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}
	return cat._id;
};

const createTemplate = async (
    payload: Partial<IEmailTemplate> & { org?: string | Types.ObjectId | null },
    orgId?: string | Types.ObjectId
): Promise<IEmailTemplate> => {
	const { title, subject, body, designJson, des, category } = payload;
	if (!title || !body || !designJson) {
		throw new AppError(httpStatus.BAD_REQUEST, "Title, body, and design JSON are required");
	}

	// Determine target org based on role and inputs
	const store = getTenantStore();
	const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;

	let targetOrgId: Types.ObjectId | null = null;
	if (isSuperAdmin) {
		// SUPER_ADMIN can explicitly set an org (via payload.org or function arg)
		const override = (payload as any).org ?? orgId ?? null;
		if (override) {
			targetOrgId = toObjectId(override);
		} else {
			// No org provided: create a global template (org: null)
			targetOrgId = null;
		}
	} else {
		// Non-super: bind to caller's org from context (plugin will also enforce)
		if (!store?.orgId && !orgId) {
			throw new AppError(httpStatus.FORBIDDEN, "Organization context is required");
		}
	if (store?.orgId) targetOrgId = toObjectId(store.orgId);
	else if (orgId) targetOrgId = toObjectId(orgId);
	}

	const updatedBody = await extractAndReplaceBase64Images(body);
	const updatedDesignJson = await extractAndReplaceBase64Images(designJson);
	const placeholders = extractPlaceholders(updatedBody);

	const categoryId = await ensureValidCategory((category as any) ?? undefined, {
		targetOrgId,
		allowAnyOrg: isSuperAdmin,
	});

		const doc = await OrgEmailTemplate.create({
		org: targetOrgId,
		title,
		subject,
		body: updatedBody,
		designJson: updatedDesignJson,
		placeholders,
		des,
		category: categoryId,
	} as IEmailTemplate);

	return doc.toObject();
};

const getTemplates = async (
    query: Record<string, string>
): Promise<IGenericResponse<IEmailTemplate[]>> => {
	const q: Record<string, string> = { ...query };
	// Support "search" alias -> searchTerm used by QueryBuilder
	if (q.search && !q.searchTerm) q.searchTerm = q.search as string;

	// Build a base query considering tenant visibility and global templates
	const store = getTenantStore();
	const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;
	// Non-super users must have an org context; otherwise forbid access
	if (!isSuperAdmin && !store?.orgId) {
		throw new AppError(httpStatus.FORBIDDEN, "Organization context is required");
	}
	let baseQuery = OrgEmailTemplate.find();

	if (!isSuperAdmin && store?.orgId) {
		// Non-super: include both org-owned and global templates
		baseQuery = OrgEmailTemplate.find({
			org: { $in: [toObjectId(store.orgId), null] },
		}).withoutTenant();
	}

	const qb = new QueryBuilder<IEmailTemplate>(baseQuery, q)
		.filter()
		.search(["title", "subject"]) // if searchTerm provided
		.sort()
		.paginate();

    // no type filtering anymore

	// category filter
	if (query.category) {
		if (!Types.ObjectId.isValid(query.category)) {
			throw new AppError(httpStatus.BAD_REQUEST, "Invalid category ID");
		}
		(qb as any).modelQuery = (qb as any).modelQuery.find({ category: query.category });
	}

	// Build the query first to get template data
	const data = await qb.build();
	const meta = await qb.getMeta();

	// Manually populate categories with proper tenant context
	if (data && data.length > 0) {
		const categoryIds = data
			.map((t: any) => t.category)
			.filter((c: any) => c != null && Types.ObjectId.isValid(String(c)));

		if (categoryIds.length > 0) {
			let categories;
			if (!isSuperAdmin && store?.orgId) {
				// For non-super admins, fetch categories that are either org-owned or global
				categories = await TemplateCategory.find({
					_id: { $in: categoryIds },
					org: { $in: [toObjectId(store.orgId), null] }
				})
					.withoutTenant()
					.select("name description")
					.lean();
			} else {
				// For super admins, fetch all categories
				categories = await TemplateCategory.find({ _id: { $in: categoryIds } })
					.select("name description")
					.lean();
			}

			// Create a map for quick lookup
			const categoryMap = new Map(categories.map((c: any) => [String(c._id), c]));

			// Populate the category field manually
			data.forEach((template: any) => {
				if (template.category) {
					const catId = String(template.category);
					template.category = categoryMap.get(catId) || null;
				}
			});
		}
	}

	return { data, meta } as unknown as IGenericResponse<IEmailTemplate[]>;
};

const getTemplateById = async (id: string): Promise<IEmailTemplate | null> => {
		if (!Types.ObjectId.isValid(id)) throw new AppError(httpStatus.BAD_REQUEST, "Invalid template ID");

		const store = getTenantStore();
		const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;
		let doc;
		if (!isSuperAdmin && store?.orgId) {
			// Non-super: allow fetching global or own org template
			doc = await OrgEmailTemplate.findOne({
				_id: id,
				org: { $in: [toObjectId(store.orgId), null] },
			})
				.withoutTenant()
				.populate("category", "name description");
		} else {
			doc = await OrgEmailTemplate.findById(id).populate("category", "name description");
		}
		if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Template not found");
		return doc.toObject();
};

const updateTemplate = async (
	id: string,
	payload: Partial<IEmailTemplate> & { org?: string | Types.ObjectId | null }
): Promise<IEmailTemplate> => {
	console.log("clicked template");
	if (!Types.ObjectId.isValid(id)) throw new AppError(httpStatus.BAD_REQUEST, "Invalid template ID");

	const { title, subject, body, designJson, des, category, org } = payload;
	if (!title || !body || !designJson) {
		throw new AppError(httpStatus.BAD_REQUEST, "Title, and body are required");
	}

		const store = getTenantStore();
		const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;

		let existing;
		if (!isSuperAdmin && store?.orgId) {
			// allow checking global template to return a clearer error when user attempts to modify it
			existing = await OrgEmailTemplate.findOne({ _id: id, org: { $in: [toObjectId(store.orgId), null] } }).withoutTenant();
		} else {
			existing = await OrgEmailTemplate.findById(id);
		}
	if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Template not found");

		// Non-super users are not allowed to update global templates (org: null)
		if (!isSuperAdmin && store?.orgId && existing.org == null) {
			throw new AppError(httpStatus.FORBIDDEN, "Cannot update global template");
		}
		

		// Handle org field updates
		if (typeof org !== "undefined") {
			// Only super admins can change the org field
			if (!isSuperAdmin) {
				throw new AppError(httpStatus.FORBIDDEN, "Only super admins can change template organization");
			}
			// Validate the new org value
			const newOrgId = toObjectId(org as any);
			existing.org = newOrgId;
		}

	const newBody = await extractAndReplaceBase64Images(body);
	const newDesignJson = designJson ? await extractAndReplaceBase64Images(designJson) : undefined;
	const newPlaceholders = extractPlaceholders(newBody);
	// const missing = findMissingPlaceholders(existing.placeholders || [], newPlaceholders);
	// if (missing.length > 0) {
	// 	throw new AppError(
	// 		httpStatus.BAD_REQUEST,
	// 		`The following placeholders are missing in the email template: ${missing.join(", ")}`
	// 	);
	// }

	const categoryId = await ensureValidCategory((category as any) ?? undefined, {
		targetOrgId: toObjectId(existing.org as any),
		allowAnyOrg: isSuperAdmin,
	});

	existing.title = title;
	existing.subject = subject;
	existing.body = newBody;
	if (newDesignJson) existing.designJson = newDesignJson;
	existing.des = des ?? existing.des;
	existing.placeholders = newPlaceholders;
	if (typeof categoryId !== "undefined") existing.category = categoryId;

	const saved = await existing.save();
	return saved.toObject();
};

const deleteTemplate = async (id: string): Promise<{ deletedId: string }> => {
		if (!Types.ObjectId.isValid(id)) throw new AppError(httpStatus.BAD_REQUEST, "Invalid template ID");

		const store = getTenantStore();
		const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;

		// First, try to load the template allowing global so we can return clearer errors
		let doc;
		if (!isSuperAdmin && store?.orgId) {
			doc = await OrgEmailTemplate.findOne({ _id: id, org: { $in: [toObjectId(store.orgId), null] } }).withoutTenant();
		} else {
			doc = await OrgEmailTemplate.findById(id);
		}

		if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Template not found");

		// Non-super users cannot delete global templates (org: null)
		if (!isSuperAdmin && store?.orgId && doc.org == null) {
			throw new AppError(httpStatus.FORBIDDEN, "Cannot delete global template");
		}

		// Proceed to delete (respecting tenant scope)
		let deleted;
		if (!isSuperAdmin && store?.orgId) {
			deleted = await OrgEmailTemplate.findOneAndDelete({ _id: id, org: toObjectId(store.orgId) }).withoutTenant();
		} else {
			deleted = await OrgEmailTemplate.findByIdAndDelete(id);
		}

		if (!deleted) throw new AppError(httpStatus.NOT_FOUND, "Template not found");
		return { deletedId: id };
};

// Category services
// SUPER_ADMIN: global category (org:null). Tenant users: category bound to their org.
const createCategory = async (payload: { name: string; description?: string }) => {
	if (!payload.name) throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
	const store = getTenantStore();
	const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;
	let org: Types.ObjectId | null = null;
	if (!isSuperAdmin) {
		if (!store?.orgId) throw new AppError(httpStatus.FORBIDDEN, "Organization context is required");
		org = toObjectId(store.orgId);
	}
	try {
		const doc = await TemplateCategory.create({ org, name: payload.name, description: payload.description });
		return doc.toObject();
	} catch (e: any) {
		if (e?.code === 11000) throw new AppError(httpStatus.BAD_REQUEST, "Category already exists");
		throw e;
	}
};

const updateCategory = async (id: string, payload: { name: string; description?: string }) => {
	if (!Types.ObjectId.isValid(id)) throw new AppError(httpStatus.BAD_REQUEST, "Invalid category ID");

	const store = getTenantStore();
	const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;

	// Load category without tenant filter so we can check org visibility rules explicitly
	const existing = await TemplateCategory.findById(id).withoutTenant();
	if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Category not found");

	// Block updates to global categories by non-super users
	if (!isSuperAdmin && existing.org == null) {
		throw new AppError(httpStatus.FORBIDDEN, "Cannot update global category");
	}

	let updated;
	if (isSuperAdmin) {
		updated = await TemplateCategory.findByIdAndUpdate(
			id,
			{ name: payload.name, description: payload.description },
			{ new: true, runValidators: true }
		);
	} else {
		// Non-super: ensure only their org category is updated
		updated = await TemplateCategory.findOneAndUpdate(
			{ _id: id, org: toObjectId(store?.orgId) },
			{ name: payload.name, description: payload.description },
			{ new: true, runValidators: true }
		).withoutTenant();
	}

	if (!updated) throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	return updated.toObject();
};

const deleteCategory = async (id: string) => {
	if (!Types.ObjectId.isValid(id)) throw new AppError(httpStatus.BAD_REQUEST, "Invalid category ID");

	const store = getTenantStore();
	const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;

	// Load category to check if it's global
	const existing = await TemplateCategory.findById(id).withoutTenant();
	if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Category not found");

	// Block deletes to global categories by non-super users
	if (!isSuperAdmin && existing.org == null) {
		throw new AppError(httpStatus.FORBIDDEN, "Cannot delete global category");
	}

	let deleted;
	if (isSuperAdmin) {
		deleted = await TemplateCategory.findByIdAndDelete(id);
	} else {
	deleted = await TemplateCategory.findOneAndDelete({ _id: id, org: toObjectId(store?.orgId) }).withoutTenant();
	}

	if (!deleted) throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	return { deletedId: id };
};

const getCategories = async () => {
		const store = getTenantStore();
		const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;
		let q = TemplateCategory.find();
		if (!isSuperAdmin && store?.orgId) {
			q = TemplateCategory.find({ org: { $in: [toObjectId(store.orgId), null] } }).withoutTenant();
		}
		const cats = await q.sort({ name: 1 });
		return cats.map((cat: any) => cat.toObject());
};


const sendTemplateTest = async (
				orgId: string | Types.ObjectId,
				templateId: string,
				to: string | string[],
				data?: Record<string, any>,
				subjectOverride?: string
) => {
	if (!Types.ObjectId.isValid(String(templateId))) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid template ID");
	}

	const store = getTenantStore();
	const isSuperAdmin = (store?.role as string) === Role.SUPER_ADMIN;
	let template;
	if (!isSuperAdmin && orgId) {
		template = await OrgEmailTemplate.findOne({
			_id: toObjectId(templateId as any),
			org: { $in: [toObjectId(orgId as any), null] },
		}).withoutTenant();
	} else {
		template = await OrgEmailTemplate.findById(templateId);
	}
	if (!template) throw new AppError(httpStatus.NOT_FOUND, "Template not found");

	// Determine which org to use for sending.
	// - Non-super users must provide orgId (validated earlier in caller) and will use it.
	// - SUPER_ADMIN may omit orgId: prefer the template's org when present; if template is global (org == null), require explicit orgId.
	let oid: Types.ObjectId | null = null;
	if (!isSuperAdmin) {
		// Non-super must provide orgId
		oid = toObjectId(orgId as any);
		if (!oid) throw new AppError(httpStatus.BAD_REQUEST, "Organization id is required to send email");
	} else {
		// SUPER_ADMIN: if orgId provided, use it; otherwise fall back to template.org when available
		if (orgId) {
			oid = toObjectId(orgId as any);
			if (!oid) throw new AppError(httpStatus.BAD_REQUEST, "Invalid organization id");
		} else if (template.org) {
			oid = toObjectId(template.org as any);
			if (!oid) throw new AppError(httpStatus.BAD_REQUEST, "Invalid organization id on template");
		} else {
			// Template is global and no org was provided — try to find any org with an active email configuration
			const fallback = await Org.findOne({ 'emailConfiguration.isActive': true }).select('_id').lean();
			if (!fallback) {
				// Try any org with an emailConfiguration if none are active
				const anyOrg = await Org.findOne({ 'emailConfiguration': { $exists: true } }).select('_id').lean();
				if (!anyOrg) {
					throw new AppError(httpStatus.BAD_REQUEST, "No organization with email configuration available to send test email");
				}
				oid = toObjectId(anyOrg._id as any);
			} else {
				oid = toObjectId(fallback._id as any);
			}
		}
	}

	// Build email options compatible with existing EmailService
	const emailOptions: any = {
		to,
		subject: subjectOverride || template.subject,
		htmlContent: template.body,
		templateData: data || {},
	};

	// Use EmailService to send (handles provider selection & logging)
	const result = await EmailService.sendEmail(oid as Types.ObjectId, emailOptions as any);
	return result;
};

export const EmailTemplateService = {
	createTemplate,
	getTemplates,
	getTemplateById,
	updateTemplate,
	deleteTemplate,
	createCategory,
	updateCategory,
	deleteCategory,
	getCategories,
	sendTemplateTest,
};

