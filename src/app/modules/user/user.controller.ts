/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserServices } from "./user.service";
import AppError from "../../errorHelpers/AppError";



const getMe = catchAsync(async (req: Request, res: Response) => {
  const decodedToken = req.user as JwtPayload;
  const result = await UserServices.getMe(decodedToken.userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Your profile Retrieved Successfully",
    data: result.data,
  });
});

const setFeatureAccess = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { featureAccess } = req.body;
  const result = await UserServices.setFeatureAccess(
    id,
    featureAccess,
    req.user as JwtPayload
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User feature access updated",
    data: { id: result?._id, featureAccess: result?.featureAccess },
  });
});

const getFeatureAccess = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserServices.getFeatureAccess(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My feature access",
    data: result,
  });
});
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserServices.getUserById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User Retrieved Successfully",
    data: result,
  });
});

const getUsersTasks = catchAsync(async (req: Request, res: Response) => {
  const decodedToken = req.user as JwtPayload;
  const user = await UserServices.getMe(decodedToken.userId);
  const orgId = user.data?.org?._id.toString() || (req.query.orgId as string);
  if (!orgId) {
    throw new AppError(httpStatus.BAD_REQUEST, "User organization not found");
  }

  const result = await UserServices.getUsersTasks(orgId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users tasks retrieved successfully",
    data: result,
  });
});

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const orgId = req.orgId as string;
    const user = await UserServices.createUser(
      req.body,
      (req.body.org || orgId),
      req.user as JwtPayload
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User Created Successfully",
      data: user,
    });
  }
);
const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    const verifiedToken = req.user;
    const payload = req.body;
    const user = await UserServices.updateUser(
      userId,
      payload,
      verifiedToken as JwtPayload
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User Updated Successfully",
      data: user,
    });
  }
);

const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await UserServices.getAllUsers(
      req.query as Record<string, string>
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "All Users Retrieved Successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const verifiedToken = req.user;
  const payload = req.body;
  const user = await UserServices.updateMe(
    payload,
    verifiedToken as JwtPayload,
    verifiedToken as JwtPayload
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User Updated Successfully",
    data: user,
  });
});

const approveRejectUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const payload = req.body;
  const user = await UserServices.approveRejectUser(
    userId,
    payload,
    req.user as JwtPayload
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User Updated Successfully",
    data: user,
  });
});

// ==================== Create Support Agent ====================
const createSupportAgent = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const logActor = req.user as JwtPayload; // From auth middleware

    const result = await UserServices.createSupportAgent(payload, logActor);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Support Agent created successfully",
      data: result,
    });
  }
);

const getAllSupportAgents = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // const { page, limit } = req.query;

    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await UserServices.getAllSupportAgents({ page, limit });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message:
        result.data.length > 0
          ? "Support Agents retrieved successfully"
          : "No Support Agents found",
      meta: result.meta,
      data: result.data,
    });
  }
);

export const UserControllers = {
  createUser,
  getAllUsers,
  updateUser,
  getMe,
  getUserById,
  updateMe,
  approveRejectUser,
  setFeatureAccess,
  getFeatureAccess,
  getUsersTasks,
  createSupportAgent,
  getAllSupportAgents
};

// route matching -> controller -> service -> model -> DB
