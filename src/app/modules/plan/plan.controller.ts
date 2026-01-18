import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PlanServices } from "./plan.service";
import { JwtPayload } from "jsonwebtoken";

const createPlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await PlanServices.createPlan(req.body, req.user as JwtPayload);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Plan created successfully",
    data: plan,
  });
});

const getAllPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await PlanServices.getAllPlans(req.query as Record<string, string>);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Plans retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPlanById = catchAsync(async (req: Request, res: Response) => {
  const plan = await PlanServices.getPlanById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Plan retrieved successfully",
    data: plan,
  });
});

const getPlanBySlug = catchAsync(async (req: Request, res: Response) => {
  const plan = await PlanServices.getPlanBySlug(req.params.slug);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Plan retrieved successfully",
    data: plan,
  });
});

const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const updated = await PlanServices.updatePlan(req.params.id, req.body, req.user as JwtPayload);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Plan updated successfully",
    data: updated,
  });
});

const deletePlan = catchAsync(async (req: Request, res: Response) => {
  const deleted = await PlanServices.deletePlan(req.params.id, req.user as JwtPayload);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Plan deleted successfully",
    data: deleted,
  });
});

export const PlanControllers = {
  createPlan,
  getAllPlans,
  getPlanById,
  getPlanBySlug,
  updatePlan,
  deletePlan,
};
