/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status-codes";
import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { EmailTemplateService } from "./emailTemplate.service";

// Template Controllers
const createTemplate = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.createTemplate(req.body, (req as any).orgId);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Email template created successfully",
		data: result,
	});
});

const getTemplates = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.getTemplates(req.query as Record<string, string>);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Email templates retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getTemplateById = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.getTemplateById(req.params.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Email template retrieved successfully",
		data: result,
	});
});

const updateTemplate = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.updateTemplate(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Email template updated successfully",
		data: result,
	});
});

const deleteTemplate = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.deleteTemplate(req.params.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Email template deleted successfully",
		data: result,
	});
});

// Category Controllers
const createCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.createCategory(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Category created successfully",
		data: result,
	});
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.updateCategory(req.params.id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category updated successfully",
		data: result,
	});
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.deleteCategory(req.params.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category deleted successfully",
		data: result,
	});
});

const getCategories = catchAsync(async (req: Request, res: Response) => {
	const result = await EmailTemplateService.getCategories();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Categories retrieved successfully",
		data: result,
	});
});

// (exports moved to bottom to avoid use-before-declaration)

// Test send using a template by id
export const testSendTemplate = catchAsync(async (req: Request, res: Response) => {
	const orgId = (req as any).orgId as string;
	const templateId = req.params.id;
	const { to, data, subjectOverride } = req.body as {
		to: string | string[];
		data?: Record<string, unknown>;
		subjectOverride?: string;
	};

	// Use service to send the test email; service will use the org's email configuration
	const result = await EmailTemplateService.sendTemplateTest((req as any).orgId, templateId, to, data as any, subjectOverride);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Test email sent",
		data: result,
	});
});

export const EmailTemplateController = {
	createTemplate,
	getTemplates,
	getTemplateById,
	updateTemplate,
	deleteTemplate,
	createCategory,
	updateCategory,
	deleteCategory,
	getCategories,
	testSendTemplate,
};

