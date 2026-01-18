import { Types } from "mongoose";
import { Log } from "./log.model";
import { ILog, CreateLogInput, LogQuery, PaginatedLogs } from "./log.interface";
import { JwtPayload } from "jsonwebtoken";
import { IGenericResponse } from "../../interfaces/common";
import { QueryBuilder } from "../../utils/QueryBuilder";
import Time from "../../utils/time";
// Add a new log - include org from authenticated user
export const addLog = async (
  logData: CreateLogInput,
  user?: JwtPayload
): Promise<ILog> => {
  const log = new Log({
    ...logData,
    user: new Types.ObjectId(logData.user),
    // Use org from token if not provided in request
    org: logData.org
      ? new Types.ObjectId(logData.org)
      : new Types.ObjectId(user?.org as string),
  });

  return await log.save();
};

// Get logs with comprehensive filtering
export const getLogs = async (query: LogQuery): Promise<IGenericResponse<ILog[]>> => {
  const {
    user,
    action,
    actions,
    orgId,
    page = 1,
    limit = 20,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
  } = query;

  const filter: any = {};

  // User filter
  if (user) {
    filter.user = new Types.ObjectId(user);
  }

  // Action filter
  if (actions && actions.length > 0) {
    filter.action = { $in: actions };
  } else if (action) {
    filter.action = action;
  }

   // Time-based filtering
  if (startDate && endDate) {
    const { start, end } = Time.getDateRangeFromISO(startDate, endDate);

    if (!Time.isValidDateTime(start) || !Time.isValidDateTime(end)) {
      throw new Error("Invalid date range provided");
    }

    filter.createdAt = {
      $gte: Time.toJSDate(start),
      $lte: Time.toJSDate(end),
    };
  } else if (startDate) {
    // Handle only start date
    const start = Time.fromISO(startDate).startOf('day');
    if (!Time.isValidDateTime(start)) {
      throw new Error("Invalid startDate format");
    }
    filter.createdAt = { $gte: Time.toJSDate(start) };
  } else if (endDate) {
    // Handle only end date
    const end = Time.fromISO(endDate).endOf('day');
    if (!Time.isValidDateTime(end)) {
      throw new Error("Invalid endDate format");
    }
    filter.createdAt = { $lte: Time.toJSDate(end) };
  }

  // Organization filter
  if (orgId) {
    filter.org = new Types.ObjectId(orgId);
  }

  // Search in details
  if (search) {
    filter.details = { $regex: search, $options: "i" };
  }

  const baseQuery = Log.find(filter)
    .populate("user", "name email")
    .populate("org", "orgName orgEmail");

  // Convert query parameters to strings for QueryBuilder
  const queryForBuilder: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
    sort: (sortOrder === "desc" ? "-" : "") + sortBy,
    ...(search && { searchTerm: search }),
    ...(action && { action }),
    ...(user && { user }),
    ...(orgId && { orgId }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const qb = new QueryBuilder(baseQuery, queryForBuilder)
    .search(["details"]) // Search only in details field
    .sort()
    .fields()
    .paginate();

  const data = await qb.build();
  const meta = await qb.getMeta();

  return { data, meta };
};

// Get all unique action types
export const getAllActionTypes = async (): Promise<IGenericResponse<string[]>> => {
  const actionTypes = await Log.distinct("action");
  const data = actionTypes.sort();
  
  return {
    data,
    meta: {
      page: 1,
      limit: data.length,
      total: data.length,
      totalPage: 1
    }
  };
};
