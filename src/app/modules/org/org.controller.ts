import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { OrgServices } from "./org.service";

const createOrg = catchAsync(async (req: Request, res: Response) => {
  const org = await OrgServices.createOrg(req.body, req.user);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Organization created successfully",
    data: org,
  });
});

const updateBillingInfo = catchAsync(async (req: Request, res: Response) => {
  const orgId = req.orgId as string;
  const org = await OrgServices.updateBillingInfo(orgId, req.body, req.user);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization billing information updated successfully",
    data: org,
  });
});

const getAllOrgs = catchAsync(async (req: Request, res: Response) => {
  const result = await OrgServices.getAllOrgs(
    req.query as Record<string, string>
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organizations retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getOrgById = catchAsync(async (req: Request, res: Response) => {
  const org = await OrgServices.getOrgById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization retrieved successfully",
    data: org,
  });
});

const updateOrg = catchAsync(async (req: Request, res: Response) => {
  const updated = await OrgServices.updateOrg(
    req.params.id,
    req.body,
    req.user
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization updated successfully",
    data: updated,
  });
});

const deleteOrg = catchAsync(async (req: Request, res: Response) => {
  const deleted = await OrgServices.deleteOrg(req.params.id, req.user);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Organization deleted successfully",
    data: deleted,
  });
});


// const updateBillingDates = catchAsync(async (req: Request, res: Response) => {
//   const org = await OrgServices.updateBillingDates(req.body, req.user);
//   console.log("------------------------here-----------------");
//   sendResponse(res, {
//     success: true,
//     statusCode: httpStatus.OK,
//     message: "Organization billing dates updated successfully",
//     data: org,
//   });
// });

export const OrgControllers = {
  createOrg,
  getAllOrgs,
  getOrgById,
  updateOrg,
  deleteOrg,
  updateBillingInfo,
};
