import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ContactService } from "./contact.service";

/**
 * CREATE: Create a new contact
 */
const create = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const orgId = req.orgId as string;
  const userId = user.userId as string;

  const contact = await ContactService.create(
    req.body,
    (req.body.org || orgId),
    userId,
    user
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Contact created successfully",
    data: contact,
  });
});

/**
 * GET ALL: Get all contacts
 */
const getAll = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.getAll(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Contacts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

/**
 * GET SINGLE: Get a single contact by ID
 */
const getSingle = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const contact = await ContactService.getSingle(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Contact retrieved successfully",
    data: contact,
  });
});

/**
 * UPDATE: Update a contact
 */
const update = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const userId = user.userId as string;
  const { id } = req.params;

  const contact = await ContactService.update(
    id,
    req.body,
    userId,
    user
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Contact updated successfully",
    data: contact,
  });
});

/**
 * SOFT DELETE: Soft delete a contact
 */
const softDelete = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const userId = user.userId as string;
  const { id } = req.params;

  await ContactService.softDelete(id, userId, user);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Contact deleted successfully",
    data: null,
  });
});

const getAllTags = catchAsync(async (req: Request, res: Response) => {  
  const orgId = req.orgId as string;
  const tags = await ContactService.getAllTags(orgId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Tags retrieved successfully",
    data: tags,
  });
});

const getUsersCountByTags = catchAsync(async (req: Request, res: Response) => { 
  const orgId = req.orgId as string;  
  const { tags } = req.body;

  const count = await ContactService.getUsersCountByTags(orgId, tags);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users count retrieved successfully",
    data: count,
  });
});

export const ContactController = {
  create,
  getAll,
  getSingle,
  update,
  softDelete,
  getAllTags,
  getUsersCountByTags
};
