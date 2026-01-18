import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { IGenericResponse } from "../../interfaces/common";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { OrgSettings } from "./orgSettings.model";
import { IOrgSettings } from "./orgSettings.interface";
import { Org } from "../org/org.model";
import { JwtPayload } from "jsonwebtoken";
import { User } from "../user/user.model";
import { LogControllers } from "../log/log.controller";

const searchableFields = ["timezone", "currency", "language"]; // adjust based on schema

const ensureOrgExists = async (orgId: string) => {
  const found = await Org.findById(orgId).select("_id");
  if (!found) throw new AppError(httpStatus.BAD_REQUEST, "Invalid org id");
};

const createOrgSettings = async (
  orgId: string,
  payload: Partial<IOrgSettings>,
  userId: string
) => {
  await ensureOrgExists(orgId);

  const existing = await OrgSettings.findOne({ org: orgId, isDeleted: false });
  if (existing) return existing;

  const created = await OrgSettings.create({
    ...payload,
    org: orgId,
    createdBy: userId,
  });

  // audit log: org settings creation
  try {
    const org = await Org.findById(orgId).select("orgName");
    const actorUser = await User.findById(userId).select("email");
    const actorDisplay = actorUser?.email || userId;
    const actorWithOrg = ({ userId, org: orgId } as unknown) as JwtPayload;
    await LogControllers.addLog(
      "Org Settings Created",
      userId,
      `Org settings created for Org'${org?.orgName}' by ${actorDisplay}`,
      actorWithOrg
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to log org settings creation:", e);
  }
  return created;
};

const getAllOrgSettings = async (
  query: Record<string, string>
): Promise<IGenericResponse<IOrgSettings[]>> => {
  const baseQuery = OrgSettings.find({ isDeleted: false }).populate({
    path: "org",
    select: "orgName orgEmail orgPhone",
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

const getMyOrgSettings = async (decodedToken: JwtPayload) => {
  const me = await User.findById(decodedToken?.userId);
  const settings = await OrgSettings.findOne({
    org: me?.org,
    isDeleted: false,
  }).populate({
    path: "org",
    select: "orgName orgEmail orgPhone",
  });

  if (!settings)
    throw new AppError(httpStatus.NOT_FOUND, "Organization settings not found");

  return settings;
};

const getOrgSettingsByOrg = async (orgId: string) => {
  const settings = await OrgSettings.findOne({
    org: orgId,
    isDeleted: false,
  }).populate({
    path: "org",
    select: "orgName orgEmail orgPhone",
  });

  if (!settings)
    throw new AppError(httpStatus.NOT_FOUND, "Organization settings not found");

  return settings;
};

const upsertMyOrgSettings = async (
  decodedToken: JwtPayload,
  patch: Partial<IOrgSettings>,
  orgId: string | undefined,
  isCreate: boolean
) => {
  const updatePayload = {
    ...patch,
    ...(isCreate
      ? { createdBy: decodedToken.userId }
      : { updatedBy: decodedToken.userId }),
  };

  const updated = await OrgSettings.findOneAndUpdate(
    { org: orgId, isDeleted: false },
    updatePayload,
    { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
  ).populate({
    path: "org",
    select: "orgName orgEmail orgPhone",
  });

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, "Organization settings not found");
  }

  // audit log: create or update (upsert)
  try {
    const org = await Org.findById(orgId).select("orgName");
    const actorDisplay = decodedToken?.email || (decodedToken as any)?.name || decodedToken?.userId || "system";
    const actorWithOrg = (decodedToken as any)?.org
      ? decodedToken
      : ({ ...(decodedToken as any), org: orgId || (decodedToken as any)?.orgId } as JwtPayload);
    const fields = Object.keys(patch || {});
    const fieldsSummary = fields.length ? ` fields=[${fields.join(", ")}]` : "";
    await LogControllers.addLog(
      isCreate ? "Organization Settings Created" : "Organization Settings Updated",
      decodedToken?.userId || "system",
      `Org settings ${isCreate ? "created" : "updated"} for Org'${org?.orgName}' by ${actorDisplay}`,
      actorWithOrg
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to log org settings upsert:", e);
  }
  return updated;
};

const deleteOrgSettings = async (orgId: string) => {
  const deleted = await OrgSettings.findOneAndUpdate(
    { org: orgId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!deleted)
    throw new AppError(httpStatus.NOT_FOUND, "Organization settings not found");

    // audit log: delete
  try {
    const org = await Org.findById(orgId).select("orgName");
    const fauxActor = ({ org: orgId } as unknown) as JwtPayload;
    await LogControllers.addLog(
      "Org Settings Deleted",
      "system",
      `Org settings deleted for Org'${org?.orgName}'`,
      fauxActor
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to log org settings deletion:", e);
  }

  return deleted;
};

export const OrgSettingsService = {
  createOrgSettings,
  getAllOrgSettings,
  getOrgSettingsByOrg,
  upsertMyOrgSettings,
  deleteOrgSettings,
  getMyOrgSettings,
};
