import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { IGenericResponse } from "../../interfaces/common";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Org } from "./org.model";
import { IOrg } from "./org.interface";
import { LogControllers } from "../log/log.controller";
import { Plan } from "../plan/plan.model";
import { hashPassword } from "../../utils/hash";
import { User } from "../user/user.model";
import { IUser } from "../user/user.interface";
// import stripe from "../../utils/stripe"; // REMOVED - stripe utility deleted
import { Types } from "mongoose";

const searchableFields = [
  "orgName",
  "orgEmail",
  "orgPhone",
  "orgAddress.address",
  "orgAddress.street",
  "orgAddress.city",
  "orgAddress.state",
  "orgAddress.zip",
  "billingInfo.paymentMethod",
  "billingInfo.cardNumber",
];

const ensurePlanExists = async (planId: string) => {
  const found = await Plan.findById(planId).select("_id");
  if (!found) throw new AppError(httpStatus.BAD_REQUEST, "Invalid plan id");
};

const createOrg = async (payload: Partial<IOrg>, logActor?: any) => {
  if (!payload.orgName || !payload.orgEmail || !payload.plan) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "orgName, orgEmail and plan are required"
    );
  }
  await ensurePlanExists(String(payload.plan));

  if (payload.billingInfo?.paymentMethodId) {
    payload.billingInfo.paymentMethodId = await hashPassword(
      payload.billingInfo.paymentMethodId
    );
  }

  const created = await Org.create(payload);

  // Create default lead intake form (best-effort, only if we have an actor userId)
  try {
    if (logActor?.userId) {
      const { bootstrapDefaultLeadIntakeForm } = await import(
        "../form/defaultForm.bootstrap"
      );
      await bootstrapDefaultLeadIntakeForm(created._id, logActor.userId);
      console.log(`✅ Default Form created for org ${created._id}`);
    }
  } catch (formError) {
    console.error("Failed to create default form:", formError);
  }

  // Log organization creation
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Organization Created",
        actor?.userId || "system",
        `Organization '${created.orgName || created._id
        }' created by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log organization creation:", logError);
    }
  }
  return created;
};

const getAllOrgs = async (
  query: Record<string, string>
): Promise<IGenericResponse<IOrg[]>> => {
  const baseQuery = Org.find().populate({
    path: "plan",
    select: "name slug price durationUnit durationValue",
  });

  const qb = new QueryBuilder(baseQuery, query)
    .filter()
    .search(searchableFields)
    .sort()
    .fields()
    .paginate();

  const data = await qb.build();
  const meta = await qb.getMeta();

  return { data, meta };
};

const getOrgById = async (id: string) => {
  const org = await Org.findById(id).populate({
    path: "plan",
    select: "name slug price durationUnit durationValue",
  });
  if (!org) throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  return org;
};

const updateOrg = async (id: string, patch: Partial<IOrg>, logActor?: any) => {
  if (patch.plan) {
    await ensurePlanExists(String(patch.plan));
  }

  if (patch.billingInfo?.paymentMethodId) {
    patch.billingInfo.paymentMethodId = await hashPassword(
      patch.billingInfo.paymentMethodId
    );
  }

  const updated = await Org.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  }).populate({
    path: "plan",
    select: "name slug price durationUnit durationValue",
  });

  if (!updated)
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");

  // 🔄 Sync User info (only Admin user of this org)
  const userUpdate: Partial<IUser> = {};

  if (patch.orgName) {
    userUpdate.name = `${patch.orgName}`;
  }
  if (patch.orgPhone) {
    userUpdate.phone = patch.orgPhone;
  }

  if (Object.keys(userUpdate).length > 0) {
    await User.findOneAndUpdate(
      { email: updated.orgEmail },
      { $set: userUpdate },
      { new: true }
    );
  }
  // Log organization update
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      const updatedFields = Object.keys(patch).join(", ");
      await LogControllers.addLog(
        "Organization Updated",
        actor?.userId || "system",
        `Organization '${updated.orgName || updated._id
        }' by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log organization update:", logError);
    }
  }
  return updated;
};

const deleteOrg = async (id: string, logActor?: any) => {
  const deleted = await Org.findByIdAndDelete(id);
  if (!deleted)
    throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
  // Log organization deletion
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Organization Deleted",
        actor?.userId || "system",
        `Organization '${deleted.orgName || deleted._id
        }' deleted by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log organization deletion:", logError);
    }
  }
  return deleted;
};

// const updateBillingInfo = async (
//   orgId: string,
//   payload: { orgId?: string; billingInfo: { paymentMethodId: string } },
//   logActor?: any
// ) => {
//   const { billingInfo } = payload;
//   // Determine which orgId to use
//   const targetOrgId =
//     logActor?.role === "SUPER_ADMIN" && payload.orgId
//       ? payload.orgId
//       : orgId;

//   if (!targetOrgId) {
//     throw new AppError(400, "Organization ID is required");
//   }

//   const org = await Org.findById(orgId as string);
//   if (!org) throw new AppError(404, "Organization not found");

//   if (!org.stripeCustomerId) {
//     // Create a Stripe customer if not already created
//     const customer = await stripe.customers.create({
//       name: org.orgName,
//       email: org.orgEmail,
//     });
//     org.stripeCustomerId = customer.id;
//   }

//   // Attach new payment method to Stripe customer
//   await stripe.paymentMethods.attach(billingInfo.paymentMethodId, {
//     customer: org.stripeCustomerId,
//   });

//   // Set as default payment method for future charges
//   await stripe.customers.update(org.stripeCustomerId, {
//     invoice_settings: { default_payment_method: billingInfo.paymentMethodId },
//   });

//   // Update org document
//   org.billingInfo = billingInfo;
//   await org.save();

//   // Log billing info update
//   if (logActor) {
//     try {
//       const actor = logActor as any;
//       const actorDisplay =
//         actor?.name || actor?.email || actor?.userId || "system";
//       await LogControllers.addLog(
//         "Organization Billing Updated",
//         actor?.userId || "system",
//         `Billing info updated for organization '${org.orgName || org._id
//         }' by ${actorDisplay}`,
//         logActor
//       );
//     } catch (logError) {
//       console.error("Failed to log billing info update:", logError);
//     }
//   }
//   return org;
// };


const updateBillingInfo= async (
  orgId: string,
  payload: { orgId?: string; billingInfo: { paymentMethodId: string } },
  logActor?: any
) => {
  const { billingInfo } = payload;
  // Determine which orgId to use
  const targetOrgId =
    logActor?.role === "SUPER_ADMIN" && payload.orgId
      ? payload.orgId
      : orgId;

  if (!targetOrgId) {
    throw new AppError(400, "Organization ID is required");
  }

  // Find the organization
  const org = await Org.findById(targetOrgId as string);
  if (!org) throw new AppError(404, "Organization not found");

  // Stripe functionality disabled - stripe utility deleted
  /*
  // If no Stripe customer, create one
  if (!org.stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: org.orgName,
      email: org.orgEmail,
    });
    org.stripeCustomerId = customer.id;
  }

  // Attach the new payment method to the Stripe customer
  await stripe.paymentMethods.attach(billingInfo.paymentMethodId, {
    customer: org.stripeCustomerId,
  });

  // Set it as the default payment method
  await stripe.customers.update(org.stripeCustomerId, {
    invoice_settings: { default_payment_method: billingInfo.paymentMethodId },
  });
  */

  // Update organization document
  org.billingInfo = billingInfo;
  await org.save();

  // Log billing info update
  if (logActor) {
    try {
      const actorDisplay =
        logActor?.name || logActor?.email || logActor?.userId || "system";
      await LogControllers.addLog(
        "Organization Billing Updated",
        logActor?.userId || "system",
        `Billing info updated for organization '${org.orgName || org._id
        }' by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log billing info update:", logError);
    }
  }

  return org;
};


// const updateBillingDates = async (
//   payload: { planStartDate?: Date; nextBillingDate?: Date },
//   logActor?: any
// ) => {
//   console.log("---------------------Starting updateBillingDates--------");
//   console.log("logActor:", logActor);
  
//   let orgId: Types.ObjectId;

//   // Get org from User model using userId from JWT
//   if (logActor?.userId) {
//     console.log("Fetching user with userId:", logActor.userId);
    
//     const userDoc = await User.findById(logActor.userId).select('org');
//     console.log("User document found:", userDoc);
    
//     if (userDoc?.org) {
//       console.log("User org field:", userDoc.org);
//       console.log("Org field type:", typeof userDoc.org);
//       console.log("Is valid ObjectId:", Types.ObjectId.isValid(userDoc.org.toString()));
      
//       // Validate that org is a valid ObjectId
//       if (Types.ObjectId.isValid(userDoc.org.toString())) {
//         orgId = new Types.ObjectId(userDoc.org.toString());
//         console.log("---------------------Valid Org ID--------", orgId);
//       } else {
//         console.error("Invalid org ID format:", userDoc.org);
//         throw new AppError(httpStatus.BAD_REQUEST, 'Invalid organization ID format');
//       }
//     } else {
//       console.error("User organization not found in user document");
//       throw new AppError(httpStatus.BAD_REQUEST, 'User organization not found');
//     }
//   } else {
//     console.error("User ID not found in logActor:", logActor);
//     throw new AppError(httpStatus.BAD_REQUEST, 'User ID not found in token');
//   }

//   console.log("Looking for org with ID:", orgId);
//   const org = await Org.findById(orgId);
  
//   if (!org) {
//     console.error("Organization not found with ID:", orgId);
//     throw new AppError(httpStatus.NOT_FOUND, "Organization not found");
//   }

//   console.log("Organization found:", org.orgName);
//   console.log("Current dates - Plan Start:", org.planStartDate, "Next Billing:", org.nextBillingDate);
//   console.log("New dates - Plan Start:", payload.planStartDate, "Next Billing:", payload.nextBillingDate);

//   // Update the billing dates
//   if (payload.planStartDate) {
//     org.planStartDate = payload.planStartDate;
//   }
//   if (payload.nextBillingDate) {
//     org.nextBillingDate = payload.nextBillingDate;
//   }

//   await org.save();
//   console.log("---------------------Update successful--------");

//   // Log billing dates update
//   if (logActor) {
//     try {
//       const actor = logActor as any;
//       const actorDisplay = actor?.name || actor?.email || actor?.userId || "system";
//       const updatedFields = [];
//       if (payload.planStartDate) updatedFields.push("planStartDate");
//       if (payload.nextBillingDate) updatedFields.push("nextBillingDate");
      
//       await LogControllers.addLog(
//         "Organization Billing Dates Updated",
//         actor?.userId || "system",
//         `Billing dates updated [${updatedFields.join(", ")}] for organization '${org.orgName}' by ${actorDisplay}`,
//         logActor
//       );
//     } catch (logError) {
//       console.error("Failed to log billing dates update:", logError);
//     }
//   }

//   return org;
// };



export const OrgServices = {
  createOrg,
  getAllOrgs,
  getOrgById,
  updateBillingInfo,
  updateOrg,
  deleteOrg,
};
