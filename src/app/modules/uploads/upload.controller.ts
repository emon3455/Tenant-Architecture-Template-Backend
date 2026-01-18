import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UploadServices } from "./upload.service";
import { JwtPayload } from "jsonwebtoken";

// Single upload
const singleUpload = catchAsync(async (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const file = req.file as Express.Multer.File;
  const decodedToken = req.user as JwtPayload;
  const orgId = (req as any).orgId;

  const result = await UploadServices.singleUpload(
    file,
    baseUrl,
    orgId,
    decodedToken.userId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "File uploaded successfully",
    data: result,
  });
});

// Multiple upload
const multipleUpload = catchAsync(async (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const files = req.files as Express.Multer.File[];
  const decodedToken = req.user as JwtPayload;
  const orgId = (req as any).orgId;

  const result = await UploadServices.multipleUpload(
    files,
    baseUrl,
    orgId,
    decodedToken.userId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Files uploaded successfully",
    data: result,
  });
});

// Delete single file
const deleteFile = catchAsync(async (req: Request, res: Response) => {
  const fileId = req.params.id;
  const orgId = (req as any).orgId;

  const result = await UploadServices.deleteFile(fileId, orgId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "File deleted successfully",
    data: result,
  });
});

// Delete multiple files
const deleteMultipleFiles = catchAsync(async (req: Request, res: Response) => {
  const { fileIds } = req.body;
  const orgId = (req as any).orgId;

  const result = await UploadServices.deleteMultipleFiles(fileIds, orgId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Files deleted successfully",
    data: result,
  });
});

// Get all files (with pagination/search)
const getAllFiles = catchAsync(async (req: Request, res: Response) => {
  const orgId = (req as any).orgId;

  const result = await UploadServices.getAllFiles(orgId, req.query as Record<string, string>);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Files retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

// Get files by Org ID (admin)
const getFilesByOrg = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;

  const result = await UploadServices.getAllFiles(orgId, req.query as Record<string, string>);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Files retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const UploadControllers = {
  singleUpload,
  multipleUpload,
  deleteFile,
  deleteMultipleFiles,
  getAllFiles,
  getFilesByOrg,
};