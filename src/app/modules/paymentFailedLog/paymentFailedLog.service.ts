import { Types } from "mongoose";
import { PaymentFailedLog } from "./paymentFailedLog.model";
import {
    IPaymentFailedLog,
    CreatePaymentFailedLogInput,
    QueryPaymentFailedLogInput,
    UpdatePaymentFailedLogInput,
    PaymentFailedLogStats,
    PaymentFailureReason,
    PaymentFailureSource,
} from "./paymentFailedLog.interface";
import { IGenericResponse } from "../../interfaces/common";
import { QueryBuilder } from "../../utils/QueryBuilder";
import Time from "../../utils/time";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status-codes";

/**
 * Create a new payment failed log
 */
export const createPaymentFailedLog = async (
    data: CreatePaymentFailedLogInput
): Promise<IPaymentFailedLog> => {
    const log = await PaymentFailedLog.create({
        ...data,
        org: new Types.ObjectId(data.org),
        user: data.user ? new Types.ObjectId(data.user) : undefined,
    });

    return log;
};

/**
 * Get all payment failed logs with filtering and pagination
 */
export const getPaymentFailedLogs = async (
    query: QueryPaymentFailedLogInput
): Promise<IGenericResponse<IPaymentFailedLog[]>> => {
    const {
        page = 1,
        limit = 20,
        search,
        source,
        failureReason,
        isResolved,
        orgId,
        userId,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
        minAmount,
        maxAmount,
    } = query;

    const filter: any = {};

    // Source filter
    if (source) {
        filter.source = source;
    }

    // Failure reason filter
    if (failureReason) {
        filter.failureReason = failureReason;
    }

    // Resolved status filter
    if (isResolved !== undefined) {
        filter.isResolved = isResolved;
    }

    // Organization filter
    if (orgId) {
        filter.org = new Types.ObjectId(orgId);
    }

    // User filter
    if (userId) {
        filter.user = new Types.ObjectId(userId);
    }

    // Amount range filters
    if (minAmount !== undefined || maxAmount !== undefined) {
        filter.amount = {};
        if (minAmount !== undefined) filter.amount.$gte = minAmount;
        if (maxAmount !== undefined) filter.amount.$lte = maxAmount;
    }

    // Time-based filtering
    if (startDate && endDate) {
        const { start, end } = Time.getDateRangeFromISO(startDate, endDate);

        if (!Time.isValidDateTime(start) || !Time.isValidDateTime(end)) {
            throw new AppError(httpStatus.BAD_REQUEST, "Invalid date range provided");
        }

        filter.createdAt = {
            $gte: Time.toJSDate(start),
            $lte: Time.toJSDate(end),
        };
    } else if (startDate) {
        const start = Time.fromISO(startDate).startOf("day");
        if (!Time.isValidDateTime(start)) {
            throw new AppError(httpStatus.BAD_REQUEST, "Invalid startDate format");
        }
        filter.createdAt = { $gte: Time.toJSDate(start) };
    } else if (endDate) {
        const end = Time.fromISO(endDate).endOf("day");
        if (!Time.isValidDateTime(end)) {
            throw new AppError(httpStatus.BAD_REQUEST, "Invalid endDate format");
        }
        filter.createdAt = { $lte: Time.toJSDate(end) };
    }

    // Search in error details, stripe error message, or transaction ID
    if (search) {
        filter.$or = [
            { errorDetails: { $regex: search, $options: "i" } },
            { stripeErrorMessage: { $regex: search, $options: "i" } },
            { transactionId: { $regex: search, $options: "i" } },
            { stripeErrorCode: { $regex: search, $options: "i" } },
        ];
    }

    const baseQuery = PaymentFailedLog.find(filter)
        .populate("org", "orgName orgEmail")
        .populate("user", "name email")
        .populate("resolvedBy", "name email");

    // Convert query parameters to strings for QueryBuilder
    const queryForBuilder: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
        sort: (sortOrder === "desc" ? "-" : "") + sortBy,
        ...(search && { searchTerm: search }),
        ...(source && { source }),
        ...(failureReason && { failureReason }),
        ...(isResolved !== undefined && { isResolved: isResolved.toString() }),
        ...(orgId && { org: orgId }),
        ...(userId && { user: userId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
    };

    const qb = new QueryBuilder(baseQuery, queryForBuilder)
        .search(["errorDetails", "stripeErrorMessage", "transactionId", "stripeErrorCode"])
        .sort()
        .fields()
        .paginate();

    const data = await qb.build();
    const meta = await qb.getMeta();

    return { data, meta };
};

/**
 * Get a single payment failed log by ID
 */
export const getPaymentFailedLogById = async (
    id: string
): Promise<IPaymentFailedLog> => {
    if (!Types.ObjectId.isValid(id)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment failed log ID");
    }

    const log = await PaymentFailedLog.findById(id)
        .populate("org", "orgName orgEmail orgPhone")
        .populate("user", "name email")
        .populate("resolvedBy", "name email");

    if (!log) {
        throw new AppError(httpStatus.NOT_FOUND, "Payment failed log not found");
    }

    return log;
};

/**
 * Update a payment failed log
 */
export const updatePaymentFailedLog = async (
    id: string,
    data: UpdatePaymentFailedLogInput
): Promise<IPaymentFailedLog> => {
    if (!Types.ObjectId.isValid(id)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment failed log ID");
    }

    const updateData: any = { ...data };

    // Set resolvedAt when marking as resolved
    if (data.isResolved === true) {
        updateData.resolvedAt = new Date();
    } else if (data.isResolved === false) {
        // Clear resolvedAt when marking as unresolved
        updateData.resolvedAt = null;
    }

    // Convert resolvedBy to ObjectId if provided
    if (data.resolvedBy) {
        updateData.resolvedBy = new Types.ObjectId(data.resolvedBy);
    }

    const log = await PaymentFailedLog.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate("org", "orgName orgEmail")
        .populate("user", "name email")
        .populate("resolvedBy", "name email");

    if (!log) {
        throw new AppError(httpStatus.NOT_FOUND, "Payment failed log not found");
    }

    return log;
};

/**
 * Delete a payment failed log
 */
export const deletePaymentFailedLog = async (id: string): Promise<void> => {
    if (!Types.ObjectId.isValid(id)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid payment failed log ID");
    }

    const log = await PaymentFailedLog.findByIdAndDelete(id);

    if (!log) {
        throw new AppError(httpStatus.NOT_FOUND, "Payment failed log not found");
    }
};

/**
 * Get payment failed log statistics
 */
export const getPaymentFailedLogStats = async (
    orgId?: string
): Promise<IGenericResponse<PaymentFailedLogStats>> => {
    const matchStage: any = {};
    if (orgId) {
        matchStage.org = new Types.ObjectId(orgId);
    }

    const [stats] = await PaymentFailedLog.aggregate([
        { $match: matchStage },
        {
            $facet: {
                overview: [
                    {
                        $group: {
                            _id: null,
                            totalFailures: { $sum: 1 },
                            unresolvedFailures: {
                                $sum: { $cond: [{ $eq: ["$isResolved", false] }, 1, 0] },
                            },
                            resolvedFailures: {
                                $sum: { $cond: [{ $eq: ["$isResolved", true] }, 1, 0] },
                            },
                            totalFailedAmount: { $sum: "$amount" },
                        },
                    },
                ],
                failuresByReason: [
                    {
                        $group: {
                            _id: "$failureReason",
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" },
                        },
                    },
                    { $sort: { count: -1 } },
                ],
                failuresBySource: [
                    {
                        $group: {
                            _id: "$source",
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" },
                        },
                    },
                    { $sort: { count: -1 } },
                ],
                recentFailures: [
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                            },
                            count: { $sum: 1 },
                            amount: { $sum: "$amount" },
                        },
                    },
                    { $sort: { _id: -1 } },
                    { $limit: 30 },
                    {
                        $project: {
                            date: "$_id",
                            count: 1,
                            amount: 1,
                            _id: 0,
                        },
                    },
                ],
            },
        },
    ]);

    const overview = stats.overview[0] || {
        totalFailures: 0,
        unresolvedFailures: 0,
        resolvedFailures: 0,
        totalFailedAmount: 0,
    };

    const data: PaymentFailedLogStats = {
        ...overview,
        failuresByReason: stats.failuresByReason || [],
        failuresBySource: stats.failuresBySource || [],
        recentFailures: stats.recentFailures || [],
    };

    return {
        data,
        meta: {
            page: 1,
            limit: 1,
            total: 1,
            totalPage: 1,
        },
    };
};

/**
 * Map Stripe error codes to PaymentFailureReason
 */
export const mapStripeErrorToFailureReason = (stripeError: any): PaymentFailureReason => {
    const errorCode = stripeError?.code || stripeError?.type;
    const declineCode = stripeError?.decline_code;

    // Map decline codes first (more specific)
    if (declineCode) {
        switch (declineCode) {
            case "insufficient_funds":
                return PaymentFailureReason.INSUFFICIENT_FUNDS;
            case "lost_card":
            case "stolen_card":
                return PaymentFailureReason.CARD_DECLINED;
            case "expired_card":
                return PaymentFailureReason.EXPIRED_CARD;
            case "incorrect_cvc":
            case "invalid_cvc":
                return PaymentFailureReason.INVALID_CARD;
            case "card_not_supported":
            case "currency_not_supported":
                return PaymentFailureReason.UNSUPPORTED_CARD;
            case "duplicate_transaction":
                return PaymentFailureReason.DUPLICATE_TRANSACTION;
            case "fraudulent":
                return PaymentFailureReason.FRAUD_DETECTED;
            default:
                return PaymentFailureReason.CARD_DECLINED;
        }
    }

    // Map error codes
    switch (errorCode) {
        case "card_declined":
            return PaymentFailureReason.CARD_DECLINED;
        case "insufficient_funds":
            return PaymentFailureReason.INSUFFICIENT_FUNDS;
        case "expired_card":
            return PaymentFailureReason.EXPIRED_CARD;
        case "invalid_card":
        case "incorrect_cvc":
        case "invalid_cvc":
        case "incorrect_number":
            return PaymentFailureReason.INVALID_CARD;
        case "authentication_required":
        case "card_authentication_failed":
        case "three_d_secure_failed":
            return PaymentFailureReason.AUTHENTICATION_FAILED;
        case "processing_error":
        case "payment_intent_unexpected_state":
            return PaymentFailureReason.PROCESSING_ERROR;
        case "rate_limit":
        case "api_error":
            return PaymentFailureReason.GATEWAY_ERROR;
        default:
            return PaymentFailureReason.UNKNOWN;
    }
};

/**
 * Helper function to log payment failures from other services
 */
export const logPaymentFailure = async (params: {
    orgId: string;
    userId?: string;
    source: PaymentFailureSource;
    failureReason: PaymentFailureReason;
    amount: number;
    currency?: string;
    paymentMethodId?: string;
    transactionId?: string;
    stripeErrorCode?: string;
    stripeErrorMessage?: string;
    errorDetails: string;
    metadata?: Record<string, any>;
    attemptCount?: number;
}): Promise<IPaymentFailedLog> => {
    try {
        const log = await createPaymentFailedLog({
            org: params.orgId,
            user: params.userId,
            source: params.source,
            failureReason: params.failureReason,
            amount: params.amount,
            currency: params.currency || "USD",
            paymentMethodId: params.paymentMethodId,
            transactionId: params.transactionId,
            stripeErrorCode: params.stripeErrorCode,
            stripeErrorMessage: params.stripeErrorMessage,
            errorDetails: params.errorDetails,
            metadata: params.metadata,
            attemptCount: params.attemptCount || 1,
        });

        return log;
    } catch (error) {
        console.error("Failed to log payment failure:", error);
        throw error;
    }
};
