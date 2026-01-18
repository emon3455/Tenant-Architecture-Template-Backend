/* eslint-disable @typescript-eslint/no-explicit-any */
// src/middlewares/checkAuth.ts
import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../config/env";
import AppError from "../errorHelpers/AppError";
import { verifyToken } from "../utils/jwt";
import { User } from "../modules/user/user.model";
import httpStatus from "http-status-codes";
import { IsActive, Role } from "../modules/user/user.interface";
import { setTenantStore } from "../lib/tenantContext";

export const checkAuth =
  (...authRoles: string[]) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let accessToken =
          (req.cookies && req.cookies.accessToken) ||
          (req.headers.authorization as string) ||
          "";

        // Support "Bearer <token>"
        if (accessToken.startsWith("Bearer ")) {
          accessToken = accessToken.slice(7).trim();
        }

        if (!accessToken) {
          throw new AppError(403, "No token received");
        }

        const verifiedToken = verifyToken(
          accessToken,
          envVars.JWT_ACCESS_SECRET
        ) as JwtPayload & { role: string; email: string; userId?: string };
        const isUserExist = await User.findOne({ email: verifiedToken.email });
        if (!isUserExist) {
          throw new AppError(httpStatus.BAD_REQUEST, "User does not exist");
        }
        if (isUserExist.isActive === IsActive.BLOCKED) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `User is ${isUserExist.isActive}`
          );
        }
        if (isUserExist.isDeleted) {
          throw new AppError(httpStatus.BAD_REQUEST, "User is deleted");
        }

        // Enhanced role checking for dynamic roles
        if (authRoles.length > 0) {
          const userRole = isUserExist.role || verifiedToken.role;

          // Check if user has any of the required roles
          const hasPermission = authRoles.some(requiredRole => {
            // Direct role match (case-insensitive)
            if (userRole.toUpperCase() === requiredRole.toUpperCase()) {
              return true;
            }

            // SUPER_ADMIN always has access (system role override)
            if (userRole.toUpperCase() === Role.SUPER_ADMIN) {
              return true;
            }

            return false;
          });

          if (!hasPermission) {
            throw new AppError(403, "You don't have access to this operation");
          }
        }

        // Update the token to include the current role from the database
        const updatedToken = {
          ...verifiedToken,
          role: isUserExist.role, // Always use the role from the database
        };

        // Attach the updated token to req plus request-scoped tenant context
        req.user = updatedToken;
        // (optional) also expose orgId on req if you like:
        (req as any).orgId = isUserExist.org;

        setTenantStore({
          userId: isUserExist._id,
          orgId: isUserExist.org,
          role: isUserExist.role,
        });

        next();
      } catch (error) {
        next(error);
      }
    };
