import { Request, Response } from "express";
import { Types } from "mongoose";
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as LogService from "./log.service";
import { Log } from "./log.model";

/**
 * Utility function to log actions from other controllers
 */
export const addLog = async (
  action: string,
  userOrId: string | Types.ObjectId | JwtPayload,
  details: string,
  user?: JwtPayload
): Promise<void> => {
  try {
    const resolvedUserPayload: JwtPayload | undefined =
      userOrId &&
      typeof userOrId === "object" &&
      (userOrId as JwtPayload).userId
        ? (userOrId as JwtPayload)
        : user;

    const orgId = resolvedUserPayload?.org
      ? new Types.ObjectId(resolvedUserPayload.org as string)
      : null;

    let resolvedUserObjectId: Types.ObjectId | null = null;
    if (
      userOrId &&
      typeof userOrId === "object" &&
      (userOrId as JwtPayload).userId
    ) {
      const uid = (userOrId as JwtPayload).userId as string;
      if (Types.ObjectId.isValid(uid))
        resolvedUserObjectId = new Types.ObjectId(uid);
    } else if (typeof userOrId === "string") {
      if (Types.ObjectId.isValid(userOrId)) {
        resolvedUserObjectId = new Types.ObjectId(userOrId);
      } else {
        resolvedUserObjectId = null;
      }
    } else if (userOrId instanceof Types.ObjectId) {
      resolvedUserObjectId = userOrId as Types.ObjectId;
    }

    const logDoc: any = {
      action,
      details,
      org: orgId,
    };

    if (resolvedUserObjectId) logDoc.user = resolvedUserObjectId;

    await Log.create(logDoc);
  } catch (error) {
    console.error("Failed to create log:", error);
  }
};

/**
 * Backward/compat helper for service-layer logging.
 * Some modules call LogControllers.createLog({ orgId, actionType, entityType, entityId, data }).
 */
export const createLog = async (params: {
  orgId?: string;
  actionType: string;
  entityType?: string;
  entityId?: string;
  data?: any;
  userId?: string;
}): Promise<void> => {
  try {
    const action = params.entityType
      ? `${params.entityType}:${params.actionType}`
      : params.actionType;

    const detailsPayload: Record<string, any> = {
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(params.data ? params.data : {}),
    };

    const logDoc: any = {
      action,
      details:
        Object.keys(detailsPayload).length > 0
          ? JSON.stringify(detailsPayload)
          : "No additional details provided",
      org: params.orgId && Types.ObjectId.isValid(params.orgId)
        ? new Types.ObjectId(params.orgId)
        : null,
    };

    if (params.userId && Types.ObjectId.isValid(params.userId)) {
      logDoc.user = new Types.ObjectId(params.userId);
    }

    await Log.create(logDoc);
  } catch (error) {
    console.error("Failed to create log (createLog):", error);
  }
};
// API endpoints
const getLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await LogService.getLogs(req.query as any);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logs Retrieved Successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getAllActionTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await LogService.getAllActionTypes();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Action Types Retrieved Successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const LogControllers = {
  addLog, // Utility function
  createLog, // Backward/compat utility function
  getLogs, // API endpoint
  getAllActionTypes, // API endpoint
};
