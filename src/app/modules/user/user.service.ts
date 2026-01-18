/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { IAuthProvider, IGetAllSupportAgentsQuery, IPaginatedResponse, IUser, Role } from "./user.interface";
import { User } from "./user.model";
import { hashPassword } from "../../utils/hash";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IGenericResponse } from "../../interfaces/common";
// import { Task } from \"../task/task.model\"; // REMOVED - task module deleted
// import { FeatureService } from "../feature/feature.service"; // REMOVED - feature module deleted
// import { Role as RoleModel } from "../role/role.model"; // REMOVED - role module deleted
// import { CommonRoleKeys } from "../role/role.interface"; // REMOVED - role module deleted
import { FilterQuery } from "mongoose";

const getMe = async (userId: string) => {
  const user = await User.findById(userId)
    .select("-password")
    .populate({
      path: "org",
      populate: { path: "plan" },
    });

  return {
    data: user,
  };
};

// keep your uniq
const uniq = <T extends string | number>(arr: (T | undefined)[]) =>
  Array.from(new Set((arr || []).filter(Boolean))) as T[];

// Sanitize payload coming from the frontend for user.featureAccess.
// Accept 'any' so we don't tie it to the Feature model interface.
// Now handles new action object structure with {description, value, isActive}
const sanitize = (features: any[] = []): any[] =>
  (features || [])
    .map((f) => {
      const cleanedSubs = (f.subFeatures || [])
        .map((sf: any) => {
          // Handle both old string format and new object format for actions
          const actions = (sf.actions || []).map((action: any) => {
            if (typeof action === "string") {
              // Convert old string format to new object format
              return {
                description: action.charAt(0).toUpperCase() + action.slice(1),
                value: action,
                isActive: true,
              };
            }
            // Already in new object format, validate structure
            return {
              description: String(
                action.description || action.value || "Unknown"
              ),
              value: String(action.value || action.description || "unknown"),
              isActive: Boolean(
                action.isActive !== undefined ? action.isActive : true
              ),
            };
          }); // Include all actions regardless of isActive status

          return {
            name: String(sf.name),
            key: String(sf.key),
            actions,
          };
        })
        .filter((sf: any) => (sf.actions?.length || 0) > 0);

      // Handle both old string format and new object format for parent actions
      const actions = (f.actions || []).map((action: any) => {
        if (typeof action === "string") {
          // Convert old string format to new object format
          return {
            description: action.charAt(0).toUpperCase() + action.slice(1),
            value: action,
            isActive: true,
          };
        }
        // Already in new object format, validate structure
        return {
          description: String(action.description || action.value || "Unknown"),
          value: String(action.value || action.description || "unknown"),
          isActive: Boolean(
            action.isActive !== undefined ? action.isActive : true
          ),
        };
      }); // Include all actions regardless of isActive status

      const cleaned = {
        name: String(f.name),
        key: String(f.key),
        actions,
        subFeatures: cleanedSubs,
      };

      return cleaned;
    })
    .filter(
      (f: any) =>
        (f.actions?.length || 0) > 0 || (f.subFeatures?.length || 0) > 0
    );

const setFeatureAccess = async (
  userId: string,
  featureAccess: any[],
  logActor?: JwtPayload
) => {
  const target = await User.findById(userId).select("_id");
  const targetAll = await User.findById(userId);
  if (!target) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const next = sanitize(featureAccess);

  const res = await User.findByIdAndUpdate(
    userId,
    { featureAccess: next },
    { new: true, select: "_id featureAccess" }
  );

  // Log feature access update
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorId = actor?.userId || userId;
      const actorPayload = logActor;
      //console.debug("[DEBUG] addLog - User Feature Access Updated", {
      //   action: "User Feature Access Updated",
      //   actor,
      //   actorUserId: actorId,
      //   fallbackUserId: userId,
      // });
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "User Feature Access Updated",
        actorId,
        `Feature access updated for user ${targetAll?.name} by ${actor?.email || actorId
        }. Features: ${(featureAccess || [])
          .map((f: any) => f.key)
          .join(", ")}`,
        actorPayload
      );
    } catch (e) {
      console.error("Failed to log feature access update:", e);
    }
  }

  return res;
};

const createUser = async (payload: Partial<IUser>,orgId: string, logActor?: JwtPayload) => {
  const {
    email,
    password,
    featureAccess,
    role: incomingRole,
    ...rest
  } = payload;

  // console.log("feature = ", featureAccess);
  // return;


  if (!email) throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  if (!password)
    throw new AppError(httpStatus.BAD_REQUEST, "Password is required");

  const isUserExist = await User.findOne({ email, org: rest.org || orgId });
  if (isUserExist)
    throw new AppError(httpStatus.BAD_REQUEST, "User Already Exist");

  console.log("Creating user with role:", incomingRole);
  // Validate the role exists if provided
  const roleUpper = String(incomingRole || "ADMIN")
    .trim()
    .toUpperCase();
  console.log("Validated role to assign:", roleUpper);
  // Role validation disabled - role module deleted
  /*
  if (rest.org && roleUpper) {
    const roleExists = await RoleModel.findOne({
      key: roleUpper,
      $or: [
        { org: rest.org, isActive: true },
        { isSystemRole: true, isActive: true },
      ],
    });

    if (!roleExists) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Role '${roleUpper}' does not exist in the organization`
      );
    }
  }
  */

  const hashedPassword = await hashPassword(password as string);
  const authProvider: IAuthProvider = {
    provider: "credentials",
    providerId: email as string,
  };

  let featureAccessToSave: any[] = [];

  if (Array.isArray(featureAccess) && featureAccess.length > 0) {
    featureAccessToSave = sanitize(featureAccess as any[]);
  } else {
    // Feature service disabled - feature module deleted
    featureAccessToSave = [];
    /*
    featureAccessToSave = await FeatureService.getDefaultFeaturesForOrgRole(
      String(rest.org),
      roleUpper
    );
    if (!featureAccessToSave.length) {
      // fallback to global, just in case
      featureAccessToSave = await FeatureService.getDefaultFeaturesForRole(
        roleUpper
      );
    }
    */
  }
  console.log(`Calculated feature access to save: ${featureAccessToSave.length} features`);
  const user = await User.create({
    email,
    password: hashedPassword,
    auths: [authProvider],
    role: roleUpper,
    featureAccess: featureAccessToSave,
    ...rest,
  });
  console.log(`User created with ID: ${(user as any)?._id?.toString()}`);
  // If frontend marks user verified, ensure it's set true
  try {
    const markVerified = payload?.isVerified === true || (payload as any)?.verified === true;
    if (markVerified && (user as any)?.isVerified !== true) {
      await User.findByIdAndUpdate((user as any)?._id, { isVerified: true });
      (user as any).isVerified = true;
    }
  } catch (e) {
    console.warn('Failed to set isVerified on user creation:', e);
  }

  // Send credentials email using DB template flow (non-blocking)
  // DISABLED - automation module deleted
  /*
  try {
    if (password) {
      const { AutomationService } = await import('../automation/automation.service');
      await AutomationService.sendCredentialsEmail(
        user,
        String(password),
        undefined,
        true,
        { orgId: (user as any)?.org }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? 'Unknown error');
    console.warn('Credentials email send failed on user creation:', msg);
  }
  */
  
  // Log creation if actor provided
  ////console.log("----     Creating    ---------------------",logActor);
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorId = actor?.userId || (user as any)?._id?.toString();
      const actorPayload = logActor;
      //console.debug("[DEBUG] addLog - User Created", {
      //   action: "User Created",
      //   actor,
      //   actorUserId: actorId,
      //   fallbackUserId: (user as any)?._id?.toString?.(),
      // });
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "User Created",
        actorId,
        `User created: id=${(user as any)?._id?.toString()} email=${(user as any)?.email
        } role=${(user as any)?.role} org=${(user as any)?.org || "N/A"}`,
        actorPayload
      );
    } catch (e) {
      //console.error("Failed to log user creation:", e);
    }
  }

  return user;
};

const updateUser = async (
  userId: string,
  payload: Partial<IUser>,
  decodedToken: JwtPayload,
  logActor?: JwtPayload
) => {
  const existingUser = await User.findById(userId);

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  // Check role change authorization
  if (payload.role) {
    if (payload.role === Role.SUPER_ADMIN && decodedToken.role === Role.ADMIN) {
      throw new AppError(httpStatus.FORBIDDEN, "You are not authorized");
    }
  }

  // Handle password hashing
  if (payload.password) {
    payload.password = await hashPassword(payload.password as string);
  }

  // Prepare the update payload
  let updateData = { ...payload };

  // If role is being changed, recalculate ALL feature access from scratch
  if (payload.role && payload.role !== existingUser.role) {
    const newRole = payload.role;
    const orgId = existingUser.org?.toString() || String(payload.org || existingUser.org);

    console.log(`User ${userId}: Role changing from ${existingUser.role} to ${newRole}`);

    //  First validate the new role exists (same as in createUser)
    const roleUpper = String(newRole || "ADMIN").trim().toUpperCase();

    // Role validation disabled - role module deleted
    /*
    if (orgId && roleUpper) {
      const roleExists = await RoleModel.findOne({
        key: roleUpper,
        $or: [
          { org: orgId, isActive: true },
          { isSystemRole: true, isActive: true },
        ],
      });

      if (!roleExists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Role '${roleUpper}' does not exist in the organization`
        );
      }
    }
    */

    //  Recalculate feature access exactly like in createUser
    let newFeatureAccess: any[] = [];

    // If featureAccess is provided in payload, use it (manual override)
    if (Array.isArray(payload.featureAccess) && payload.featureAccess.length > 0) {
      newFeatureAccess = sanitize(payload.featureAccess as any[]);
      console.log(`Using manually provided feature access: ${newFeatureAccess.length} features`);
    } else {
      // Feature service disabled - feature module deleted
      newFeatureAccess = [];
      /*
      // ⭐ Get default features for the new role (same logic as createUser)
      newFeatureAccess = await FeatureService.getDefaultFeaturesForOrgRole(
        orgId,
        roleUpper
      );

      // Fallback to global defaults if org-specific not found
      if (!newFeatureAccess.length) {
        newFeatureAccess = await FeatureService.getDefaultFeaturesForRole(roleUpper);
      }
      */

      console.log(`Calculated default feature access: ${newFeatureAccess.length} features for role ${roleUpper}`);
    }

    // Set both role AND featureAccess in update
    updateData.role = roleUpper;
    updateData.featureAccess = newFeatureAccess;

    console.log(`Feature access updated for user ${userId}: ${updateData.featureAccess?.length || 0} features`);
  } else {
    //  If role is NOT changing but featureAccess is provided, sanitize it
    if (payload.featureAccess && Array.isArray(payload.featureAccess)) {
      updateData.featureAccess = sanitize(payload.featureAccess as any[]);
    } else if (!payload.featureAccess) {
      // If featureAccess is not provided, don't modify existing permissions
      delete updateData.featureAccess;
    }
  }

  // Perform the update
  const newUpdatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!newUpdatedUser) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update user");
  }

  //  Log user update with role change details
  if (userId) {
    try {
      const actor = (logActor as any) || decodedToken;
      const actorId = (logActor as any)?.userId || decodedToken?.userId || null;
      const actorPayload = logActor || decodedToken;

      let logMessage = `User ${newUpdatedUser?.name || newUpdatedUser?.email || userId} updated by ${actor?.name || actor?.email || actorId}`;

      // Add role change information to log
      if (payload.role && payload.role !== existingUser.role) {
        logMessage += ` (Role changed from ${existingUser.role} to ${payload.role} with ${newUpdatedUser.featureAccess?.length || 0} features)`;
      } else if (payload.featureAccess && Array.isArray(payload.featureAccess)) {
        logMessage += ` (Manual feature access update: ${payload.featureAccess.length} features)`;
      }

      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "User Updated",
        actorId,
        logMessage,
        actorPayload as any
      );
    } catch (e) {
      console.error("Failed to log user update:", e);
    }
  }

  return newUpdatedUser;
};

const getAllUsers = async (
  query: Record<string, string>
): Promise<IGenericResponse<IUser[]>> => {
  const modifiedQuery = { ...query };

  // Extract orgId from query if present
  const { orgId, ...restQuery } = modifiedQuery;

  // Build base query with orgId filter if provided
  const baseQuery = (orgId
    ? User.find({ org: orgId })
    : User.find()
  )
    .select("-password -otpCode -otpExpiresAt -otpPurpose -auths -isDeleted")
    .populate("org", "orgName");

  const queryBuilder = new QueryBuilder(baseQuery, restQuery)
    .filter()
    .search(["name", "email", "phone"])
    .sort()
    .fields()
    .paginate();

  const allUsers = await queryBuilder.build();
  const meta = await queryBuilder.getMeta();

  // Calculate isAvailable for CREW users based on current task assignments
  // DISABLED - Task module deleted
  const usersWithAvailability = allUsers.map((user) => {
    // if (user.role === Role.CREW) {
    //   // Check if crew member has any tasks (future deadlines)
    //   const allTasks = await Task.find({
    //     assignedTo: user._id,
    //     isDeleted: false,
    //     deadline: { $gte: new Date() } // Tasks with future deadlines
    //   });
    //
    //   // Crew is available if they have no tasks
    //   user.isAvailable = allTasks.length === 0;
    // }
    return user;
  });

  return {
    data: usersWithAvailability,
    meta,
  };
};

const updateMe = async (
  payload: Partial<IUser>,
  decodedToken: JwtPayload,
  logActor?: JwtPayload
) => {
  const ifUserExist = await User.findById(decodedToken?.userId);

  if (!ifUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  if (payload.password) {
    payload.password = await hashPassword(payload.password as string);
  }

  const newUpdatedUser = await User.findByIdAndUpdate(
    decodedToken?.userId,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );

  // Log self update
  if (logActor) {
    try {
      const actor = logActor as any;
      //console.debug("[DEBUG] addLog - User Updated Self", {
      //   action: "User Updated Self",
      //   actor,
      //   actorUserId: actor?.userId,
      //   fields: Object.keys(payload || {}),
      // });
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "User Updated Self",
        actor?.userId,
        `User ${actor?.userId} updated own profile. Fields: ${Object.keys(
          payload || {}
        ).join(", ")}`,
        logActor
      );
    } catch (e) {
      //console.error("Failed to log self update:", e);
    }
  }

  return newUpdatedUser;
};

const approveRejectUser = async (
  userId: string,
  payload: Partial<IUser>,
  logActor?: JwtPayload
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
  }

  // Prevent admin from blocking/unblocking themselves
  if (logActor?.userId && logActor.userId.toString() === userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You cannot change your own account status"
    );
  }

  user.isActive = payload.isActive;

  await user.save();
  // Log approve/reject
  if (logActor) {
    try {
      const actor = logActor as any;
      //console.debug("[DEBUG] addLog - User Approved/Blocked", {
      //   action:
      //     payload?.isActive === "ACTIVE"
      //       ? "User Approved"
      //       : payload?.isActive === "BLOCKED"
      //       ? "User Blocked"
      //       : "User Status Updated",
      //   actor,
      //   actorUserId: actor?.userId,
      //   targetUserId: userId,
      //   newStatus: payload?.isActive,
      // });
      const actorId = actor?.userId || null;
      const actorPayload = logActor;
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        payload?.isActive === "ACTIVE"
          ? "User Approved"
          : payload?.isActive === "BLOCKED"
            ? "User Blocked"
            : "User Status Updated",
        actorId,
        `User ${userId} status changed to ${payload?.isActive} by ${actor?.email || actorId
        }`,
        actorPayload
      );
    } catch (e) {
      console.error("Failed to log user approve/reject:", e);
    }
  }

  return user;
};

const getFeatureAccess = async (id: string) => {
  const me = await User.findById(id).select("featureAccess").lean();
  if (!me) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  return me.featureAccess || [];
};

const getUserById = async (id: string) => {
  const user = await User.findById(id).lean();
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  return user;
};

const getUsersTasks = async (orgId: string) => {
  // Find users under the specified organization
  const users = await User.find({
    org: orgId,
    isDeleted: { $ne: true },
    role: { $ne: 'CLIENT' }
  }).select('_id name email role').lean();
  // console.log(users)
  const usersWithTasks: any[] = [];

  // DISABLED - Task module deleted
  throw new AppError(httpStatus.NOT_IMPLEMENTED, "User task statistics are not available - task module deleted");
  
  /*
  for (const user of users) {
    // Count all tasks assigned to this user (regardless of deadline)
    const taskCount = await Task.countDocuments({
      assignedTo: user._id,
      isDeleted: false
    });

    // Get all tasks for this user to calculate additional metrics
    const allTasks = await Task.find({
      assignedTo: user._id,
      isDeleted: false
    }).select('deadline status').sort({ deadline: -1 });

    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;
    const now = new Date();

    allTasks.forEach(task => {
      if (task.status === 'Completed') {
        completedTasks++;
      } else if (task.status === 'Overdue') {
        overdueTasks++;
      } else if (task.status === 'To Do' || task.status === 'Ongoing') {
        pendingTasks++;
        // Check if overdue based on deadline
        if (task.deadline && task.deadline < now) {
          overdueTasks++;
        }
      }
    });

    usersWithTasks.push({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      totalTasks: taskCount,
      completedTasks,
      pendingTasks,
      overdueTasks
    });
  }

  // Calculate summary statistics
  const totalTasks = usersWithTasks.reduce((sum, user) => sum + user.totalTasks, 0);
  const totalCompletedTasks = usersWithTasks.reduce((sum, user) => sum + user.completedTasks, 0);
  const totalPendingTasks = usersWithTasks.reduce((sum, user) => sum + user.pendingTasks, 0);
  const totalOverdueTasks = usersWithTasks.reduce((sum, user) => sum + user.overdueTasks, 0);

  return {
    totalUsers: users.length,
    summary: {
      totalTasks,
      totalCompletedTasks,
      totalPendingTasks,
      totalOverdueTasks
    },
    users: usersWithTasks
  };
};
  */
};


// const createSupportAgent = async (
//   payload: Partial<IUser>,
//   logActor?: JwtPayload
// ) => {
//   const { email, password, featureAccess, role: incomingRole, ...rest } = payload;

//   if (!email) throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
//   if (!password) throw new AppError(httpStatus.BAD_REQUEST, "Password is required");

//   // Check for duplicate email
//   const isUserExist = await User.findOne({ email });
//   if (isUserExist)
//     throw new AppError(httpStatus.BAD_REQUEST, "User Already Exist");

//   // Force role to SUPPORT_AGENT
//   const roleUpper = Role.SUPPORT_AGENT;
//   console.log("Creating Support Agent with role:", roleUpper);


//   // Optional: check if role exists in RoleModel
//   // const roleExists = await RoleModel.findOne({
//   //   key: roleUpper,
//   //   $or: [{ isSystemRole: true, isActive: true }],
//   // });


//   // if (!roleExists) {
//   //   throw new AppError(
//   //     httpStatus.BAD_REQUEST,
//   //     `Role '${roleUpper}' does not exist as a system role`
//   //   );
//   // }

//   // Hash password
//   const hashedPassword = await hashPassword(password as string);

//   // Auth provider
//   const authProvider: IAuthProvider = {
//     provider: "credentials",
//     providerId: email as string,
//   };

//   // Determine feature access
//   let featureAccessToSave: any[] = [];
//   if (Array.isArray(featureAccess) && featureAccess.length > 0) {
//     featureAccessToSave = sanitize(featureAccess as any[]);
//   } else {
//     // For support agents, use global feature defaults
//     featureAccessToSave = await FeatureService.getDefaultFeaturesForRole(roleUpper);
//   }

//   // console.log({
//   //   email,
//   //   password: hashedPassword,
//   //   auths: [authProvider],
//   //   role: roleUpper,
//   //   featureAccess: featureAccessToSave,
//   //   ...rest,
//   // })
  

//   // Create user
//   const user = await User.create({
//     email,
//     password: hashedPassword,
//     auths: [authProvider],
//     role: roleUpper,
//     featureAccess: featureAccessToSave,
//     ...rest, // rest may include name, phone, etc.
    
//   });

//   // Log creation
//   if (logActor) {
//     try {
//       const actor = logActor as any;
//       const actorId = actor?.userId || (user as any)?._id?.toString();
//       const actorPayload = logActor;
//       await (
//         await import("../log/log.controller")
//       ).LogControllers.addLog(
//         "User Created",
//         actorId,
//         `Support Agent created: id=${(user as any)?._id?.toString()} email=${
//           (user as any)?.email
//         } role=${(user as any)?.role}`,
//         actorPayload
//       );
//     } catch (e) {
//       // Logging failure ignored
//     }
//   }

//   return user;
// };

const createSupportAgent = async (
  payload: Partial<IUser>,
  logActor?: JwtPayload
) => {
  const {
    email,
    password,
    featureAccess,
    role: incomingRole,
    ...rest
  } = payload;

  if (!email) throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  if (!password)
    throw new AppError(httpStatus.BAD_REQUEST, "Password is required");

  // Check for duplicate email
  const isUserExist = await User.findOne({ email });
  if (isUserExist)
    throw new AppError(httpStatus.BAD_REQUEST, "User Already Exist");

  // Force role to SUPPORT_AGENT
  const roleUpper = Role.SUPPORT_AGENT;
  console.log("Creating Support Agent with role:", roleUpper);

  // Hash password
  const hashedPassword = await hashPassword(password as string);

  // Auth provider
  const authProvider: IAuthProvider = {
    provider: "credentials",
    providerId: email as string,
  };

  // Determine feature access
  let featureAccessToSave: any[] = [];
  if (Array.isArray(featureAccess) && featureAccess.length > 0) {
    featureAccessToSave = sanitize(featureAccess as any[]);
  } else {
    // Feature service disabled - feature module deleted
    featureAccessToSave = [];
    /*
    // For support agents, use global feature defaults
    featureAccessToSave = await FeatureService.getDefaultFeaturesForRole(
      roleUpper
    );
    */
  }

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    auths: [authProvider],
    role: roleUpper,
    featureAccess: featureAccessToSave,
    ...rest, // rest may include name, phone, storageUsage, etc.
  });

  // If frontend marks user verified, ensure it's set true
  try {
    const markVerified =
      payload?.isVerified === true || (payload as any)?.verified === true;
    if (markVerified && (user as any)?.isVerified !== true) {
      await User.findByIdAndUpdate((user as any)?._id, { isVerified: true });
      (user as any).isVerified = true;
    }
  } catch (e) {
    console.warn("Failed to set isVerified on agent creation:", e);
  }

  // Send credentials email using DB template flow (non-blocking)
  try {
    if (password) {
      const { AutomationService } = await import(
        "../automation/automation.service"
      );
      await AutomationService.sendCredentialsEmail(
        user,
        String(password),
        undefined,
        true,
        { orgId: (user as any)?.org }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
    console.warn("Credentials email send failed on agent creation:", msg);
  }

  // Log creation
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorId = actor?.userId || (user as any)?._id?.toString();
      const actorPayload = logActor;
      await (
        await import("../log/log.controller")
      ).LogControllers.addLog(
        "User Created",
        actorId,
        `Support Agent created: id=${(user as any)?._id?.toString()} email=${
          (user as any)?.email
        } role=${(user as any)?.role}`,
        actorPayload
      );
    } catch (e) {
      // Logging failure ignored
    }
  }

  return user;
};

const getAllSupportAgents = async (
  query: IGetAllSupportAgentsQuery
): Promise<IPaginatedResponse<Partial<IUser>>> => {
  const { page = 1, limit = 10 } = query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter: FilterQuery<IUser> = {
    role: Role.SUPPORT_AGENT,
    isActive: { $ne: "BLOCKED" },
    $or: [{ org: { $exists: false } }, { org: null }],
  };

  const [supportAgents, total] = await Promise.all([
    User.find(filter)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    data: supportAgents,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};


export const UserServices = {
  createUser,
  getAllUsers,
  updateUser,
  getMe,
  updateMe,
  approveRejectUser,
  setFeatureAccess,
  getFeatureAccess,
  getUserById,
  getUsersTasks,
  createSupportAgent,
  getAllSupportAgents
};
