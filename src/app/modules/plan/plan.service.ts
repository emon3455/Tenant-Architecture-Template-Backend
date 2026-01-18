import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { IGenericResponse } from "../../interfaces/common";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Plan } from "./plan.model";
import { IPlan } from "./plan.interface";
import { JwtPayload } from "jsonwebtoken";
import { LogControllers } from "../log/log.controller";

const searchableFields = ["name", "description", "slug", "features"];

const makeSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ensurePostTrialPlanExists = async (postTrialPlan?: string | null, currentPlanId?: string) => {
  if (!postTrialPlan) return null;
  if (currentPlanId && String(postTrialPlan) === String(currentPlanId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Post Trial Plan cannot reference the same plan");
  }
  const targetPlan = await Plan.findById(postTrialPlan).select("_id isTrial name");
  if (!targetPlan) {
    throw new AppError(httpStatus.BAD_REQUEST, "Post Trial Plan does not reference an existing plan");
  }
  if (targetPlan.isTrial) {
    throw new AppError(httpStatus.BAD_REQUEST, "Post Trial Plan cannot reference another trial plan");
  }
  return targetPlan._id;
};

const createPlan = async (payload: Partial<IPlan>, actor?: JwtPayload) => {
  if (!payload.name) {
    throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
  }

  const isTrial = Boolean(payload.isTrial);
  const validatedPostTrialPlan = await ensurePostTrialPlanExists(
    isTrial ? (payload.postTrialPlan as any) : null
  );

  const slug = payload.slug?.trim() || makeSlug(payload.name);
  const plan = await Plan.create({
    ...payload,
    slug,
    features: payload.features || [],
    isTrial,
    postTrialPlan: validatedPostTrialPlan,
    isActive: payload.isActive ?? true,
    serial: payload.serial ?? 0,
  });
  // audit log (no IDs in message)
  try {
    const actorDisplay = (actor as any)?.name || actor?.email || actor?.userId || "system";
    // Ensure org is forwarded if available
    const actorWithOrg = (actor as any)?.org ? actor : ({ ...(actor as any), org: (actor as any)?.orgId } as JwtPayload);
    await LogControllers.addLog(
      "Plan Created",
      actor?.userId || "system",
      `Plan created: Name='${(plan as any)?.name}' by ${actorDisplay}`,
      actorWithOrg
    );
  } catch (e) {
    // do not interrupt service flow
    // eslint-disable-next-line no-console
    console.error("Failed to log plan creation:", e);
  }
  return plan;
};

const getAllPlans = async (
  query: Record<string, string>
): Promise<IGenericResponse<IPlan[]>> => {
  const baseQuery = Plan.find(
    query.activeOnly === "true" ? { isActive: true } : {}
  ).sort({ serial: 1 });

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

const getPlanById = async (id: string) => {
  const plan = await Plan.findById(id);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
  return plan;
};

const getPlanBySlug = async (slug: string) => {
  const plan = await Plan.findOne({ slug });
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
  return plan;
};

const updatePlan = async (id: string, patch: Partial<IPlan>, actor?: JwtPayload) => {
  // If slug not explicitly provided but name is changing, refresh slug from name
  if (!patch.slug && patch.name) {
    patch.slug = makeSlug(patch.name);
  }

  const existing = await Plan.findById(id);
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");

  const willBeTrial = typeof patch.isTrial === "boolean" ? patch.isTrial : Boolean(existing.isTrial);
  const targetPostTrialPlan =
    patch.postTrialPlan !== undefined ? (patch.postTrialPlan as any) : existing.postTrialPlan;
  const validatedPostTrialPlan = willBeTrial
    ? await ensurePostTrialPlanExists(targetPostTrialPlan ? String(targetPostTrialPlan) : null, id)
    : null;

  const updated = await Plan.findByIdAndUpdate(
    id,
    {
      ...patch,
      isTrial: willBeTrial,
      postTrialPlan: validatedPostTrialPlan,
      isActive: patch.isActive ?? existing.isActive,
      serial: patch.serial ?? existing.serial ?? 0,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updated) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
  // audit log (no IDs in message)
  try {
    const actorDisplay = (actor as any)?.name || actor?.email || actor?.userId || "system";
    const fields = Object.keys(patch || {}).join(", ");
    const actorWithOrg = (actor as any)?.org ? actor : ({ ...(actor as any), org: (actor as any)?.orgId } as JwtPayload);
    await LogControllers.addLog(
      "Plan Updated",
      actor?.userId || "system",
      `Plan updated: Name='${(updated as any)?.name}' fields=[${fields}] by ${actorDisplay}`,
      actorWithOrg
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to log plan update:", e);
  }
  return updated;
};

const deletePlan = async (id: string, actor?: JwtPayload) => {
  const deleted = await Plan.findByIdAndDelete(id);
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");
  // audit log (no IDs in message)
  try {
    const actorDisplay = (actor as any)?.name || actor?.email || actor?.userId || "system";
    const actorWithOrg = (actor as any)?.org ? actor : ({ ...(actor as any), org: (actor as any)?.orgId } as JwtPayload);
    await LogControllers.addLog(
      "Plan Removed",
      actor?.userId || "system",
      `Plan Removed: Name='${(deleted as any)?.name}' by ${actorDisplay}`,
      actorWithOrg
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to log plan deletion:", e);
  }
  return deleted;
};

export const PlanServices = {
  createPlan,
  getAllPlans,
  getPlanById,
  getPlanBySlug,
  updatePlan,
  deletePlan,
};
