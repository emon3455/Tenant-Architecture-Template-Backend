import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { OrgSettingsService } from "./orgSettings.service";
import { JwtPayload } from "jsonwebtoken";

// 🔹 Get my org settings
const getMyOrgSettings = catchAsync(async (req: Request, res: Response) => {
  const verifiedToken = req.user;
  const settings = await OrgSettingsService.getMyOrgSettings(
    verifiedToken as JwtPayload
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization settings retrieved successfully",
    data: settings,
  });
});

// 🔹 Get org settings by orgId
const getOrgSettingsByOrgId = catchAsync(async (req: Request, res: Response) => {
  const settings = await OrgSettingsService.getOrgSettingsByOrg(
    req.params.orgId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization settings retrieved successfully",
    data: settings,
  });
});

// 🔹 Upsert my org settings (create or update)
const upsertMyOrgSettings = catchAsync(async (req: Request, res: Response) => {
  const verifiedToken = req.user;

  // 👇 decide create vs update from path
  const isCreate = req.route.path === "/create-my-setting";

  const updated = await OrgSettingsService.upsertMyOrgSettings(
    verifiedToken as JwtPayload,
    req.body,
    req.orgId,
    isCreate
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: isCreate
      ? "Organization settings created successfully"
      : "Organization settings updated successfully",
    data: updated,
  });
});

// 🔹 Get all org settings
const getAllOrgSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgSettingsService.getAllOrgSettings(
    req.query as Record<string, string>
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "All organization settings retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

// 🔹 Delete org settings by orgId
const deleteOrgSettings = catchAsync(async (req: Request, res: Response) => {
  const deleted = await OrgSettingsService.deleteOrgSettings(req.params.orgId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization settings deleted successfully",
    data: deleted,
  });
});

// 🔹 Create org settings explicitly
const createOrgSettings = catchAsync(async (req: Request, res: Response) => {
  const verifiedToken = req.user;

  const created = await OrgSettingsService.createOrgSettings(
    req.body.orgId,
    req.body,
    (verifiedToken as JwtPayload).userId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Organization settings created successfully",
    data: created,
  });
});

export const OrgSettingsControllers = {
  getMyOrgSettings,
  getOrgSettingsByOrgId,
  upsertMyOrgSettings,
  getAllOrgSettings,
  deleteOrgSettings,
  createOrgSettings,
};
