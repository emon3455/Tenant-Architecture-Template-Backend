import mongoose, { Types } from "mongoose";
import crypto from "crypto";
import { Org } from "../org/org.model";
import { OrgEmailTemplate } from "../emailTemplate/emailTemplate.model";
import { Plan } from "../plan/plan.model";
import { User } from "../user/user.model";
import AppError from "../../errorHelpers/AppError";

import { LogControllers } from "../log/log.controller";
import { LOG_ACTIONS } from "../log/log.actions";
import { JwtPayload } from "jsonwebtoken";

import { hashPassword } from "../../utils/hash";
import { DurationUnit } from "../plan/plan.interface";
import httpStatus from "http-status-codes";
import { production } from "../../constant/constant";

export interface PurchasePayload {
  orgName: string;
  orgEmail: string;
  orgPhone: string;
  planId: string;
  billingInfo: {
    paymentMethodId: string; // ✅ ONLY need this now
  };
}

interface ChangePlanPayload {
  orgId: string;
  planId: string;
  billingInfo: {
    paymentMethodId: string;
  };
  userId?: string;
}

export const calculateNextBillingDate = (startDate: Date, plan: any): Date => {
  const nextBillingDate = new Date(startDate);
  switch (plan.durationUnit) {
    case DurationUnit.DAY:
      nextBillingDate.setDate(nextBillingDate.getDate() + plan.durationValue);
      break;
    case DurationUnit.WEEK:
      nextBillingDate.setDate(
        nextBillingDate.getDate() + plan.durationValue * 7
      );
      break;
    case DurationUnit.MONTH:
      nextBillingDate.setMonth(nextBillingDate.getMonth() + plan.durationValue);
      break;
    case DurationUnit.YEAR:
      nextBillingDate.setFullYear(
        nextBillingDate.getFullYear() + plan.durationValue
      );
      break;
    default:
      break;
  }
  return nextBillingDate;
};

// In purchase.service.ts - update logPlanChange function
const logPlanChange = async (
  org: any,
  oldPlan: any,
  newPlan: any,
  payment: any,
  user?: JwtPayload
) => {
  ////console.log("[DEBUG] logPlanChange called with user:", user);
  ////console.log("[DEBUG] Organization:", org._id, org.orgName);

  let userIdForLog: string | Types.ObjectId | JwtPayload = "system";
  let orgIdForLog: Types.ObjectId | null = new Types.ObjectId(org._id);

  let by;
  if (user?.userId) {
    userIdForLog = user.userId;
  } else if (user && typeof user === "object") {
    userIdForLog = (user as any).name || (user as any)._name || "system";
  }

  const logDetails = `Plan changed for organization "${org.orgName}": ${
    oldPlan?.name || "Unknown"
  } → ${newPlan.name} || Amount: ${newPlan.price} `;

  //console.log("[DEBUG] Attempting to log:", logDetails);
  //console.log("[DEBUG] Organization ID for log:", orgIdForLog);

  try {
    await LogControllers.addLog(
      LOG_ACTIONS.PLAN_CHANGED,
      userIdForLog,
      logDetails,
      { ...user, org: orgIdForLog.toString() } as JwtPayload // Add org context
    );
    //console.log("[DEBUG] Plan change logged successfully");
  } catch (logError) {
    console.error("Failed to log plan change action:", logError);
  }
};

const handlePurchase = async (
  payload: PurchasePayload,
  logActor?: JwtPayload
) => {
  // Check if orgName already exists
  const existingOrg = await Org.findOne({ orgName: payload.orgName });
  if (existingOrg) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Organization name already exists"
    );
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: payload.orgEmail });
  if (existingUser) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  // 1) Find plan (no session)
  const plan = await Plan.findById(payload.planId);
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");

  // 2) Calculate plan start and next billing dates
  const planStartDate = new Date();
  const nextBillingDate = new Date(planStartDate);
  switch (plan.durationUnit) {
    case DurationUnit.DAY:
      nextBillingDate.setDate(nextBillingDate.getDate() + plan.durationValue);
      break;
    case DurationUnit.WEEK:
      nextBillingDate.setDate(
        nextBillingDate.getDate() + plan.durationValue * 7
      );
      break;
    case DurationUnit.MONTH:
      nextBillingDate.setMonth(nextBillingDate.getMonth() + plan.durationValue);
      break;
    case DurationUnit.YEAR:
      nextBillingDate.setFullYear(
        nextBillingDate.getFullYear() + plan.durationValue
      );
      break;
    default:
      break;
  }

  // 3) Stripe operations (external) - create customer, attach payment method, charge
  // const stripeCustomer = await stripe.customers.create({
  //   email: payload.orgEmail,
  //   name: payload.orgName,
  // });

  // await stripe.paymentMethods.attach(payload.billingInfo.paymentMethodId, {
  //   customer: stripeCustomer.id,
  // });

  // await stripe.customers.update(stripeCustomer.id, {
  //   invoice_settings: {
  //     default_payment_method: payload.billingInfo.paymentMethodId,
  //   },
  // });

  // Charge immediately (add a real idempotency key in prod)
  // const idempotencyKey = `purchase_${payload.orgEmail}_${Date.now()}`;
  // const paymentIntent = await stripe.paymentIntents.create(
  //   {
  //     amount: Math.round((plan.price ?? 0) * 100),
  //     currency: "usd",
  //     customer: stripeCustomer.id,
  //     payment_method: payload.billingInfo.paymentMethodId,
  //     off_session: true,
  //     confirm: true,
  //     description: `Payment for ${plan.name} plan`,
  //     metadata: {
  //       planId: plan._id?.toString?.(),
  //       orgEmail: payload.orgEmail,
  //     },
  //   },
  //   { idempotencyKey }
  // );

  // if (paymentIntent.status !== "succeeded") {
  //   throw new AppError(httpStatus.BAD_REQUEST, "Payment failed");
  // }

  // 5) Start DB transaction and create Org, Payment, User (assign default features)
  const session = await mongoose.startSession();
  await session.startTransaction();

  let org: any = null;
  let payment: any = null;
  let user: any = null;
  const invoiceId = "INV-" + Date.now();

  try {
    const orgArr = await Org.create(
      [
        {
          orgName: payload.orgName,
          orgEmail: payload.orgEmail,
          orgPhone: payload.orgPhone,
          plan: plan._id,
          billingInfo: payload.billingInfo,
          // stripeCustomerId: stripeCustomer.id,
          status: "ACTIVE",
          planStartDate,
          nextBillingDate,
        },
      ],
      { session, ordered: true }
    );
    org = orgArr[0];

    // after orgArr & org = orgArr[0];
    // await seedOrgPolicyFromFeatures(String(org._id), session);

    // Create default roles for the new organization
    // await RoleService.createDefaultRoles(String(org._id), session);

    // const defaultsRaw = await FeatureService.getDefaultFeaturesForOrgRole(
    //   String(org._id),
    //   CommonRoleKeys.ADMIN
    // );
    // const defaultFeatureAccess = defaultsRaw;

    // const paymentArr = await Payment.create(
    //   [
    //     {
    //       org: org._id,
    //       plan: plan._id,
    //       amount: plan.price,
    //       status: "SUCCESS",
    //       transactionId: paymentIntent.id,
    //       invoiceId,
    //       description: "Plan Purchase",
    //       type: PaymentType.PLAN,
    //     },
    //   ],
    //   { session, ordered: true }
    // );
    // payment = paymentArr[0];

    const rawPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await hashPassword(rawPassword);

    const userArr = await User.create(
      [
        {
          name: payload.orgName,
          email: payload.orgEmail,
          password: hashedPassword,
          org: org._id,
          // role: CommonRoleKeys.ADMIN,
          phone: payload.orgPhone,
          isVerified: true,
          // featureAccess: defaultFeatureAccess,
          isOrgOwner: true,
        },
      ],
      { session, ordered: true }
    );
    user = userArr[0];

    // Create default sales pipeline with stages and automations
    try {
      // const { bootstrapDefaultSalesPipeline } = await import(
      //   "../pipeline/defaultSales.bootstrap"
      // );
      // await bootstrapDefaultSalesPipeline(org._id, user._id, session);
      // console.log(`✅ Default Sales Pipeline created for org ${org._id}`);
    } catch (pipelineError) {
      console.error("Failed to create default sales pipeline:", pipelineError);
    }

    // Create default lead intake form (best-effort)
    try {
      // const { bootstrapDefaultLeadIntakeForm } = await import(
      //   "../form/defaultForm.bootstrap"
      // );
      // await bootstrapDefaultLeadIntakeForm(org._id, user._id, session);
      // console.log(`✅ Default Form created for org ${org._id}`);
    } catch (formError) {
      console.error("Failed to create default form:", formError);
      // Don't throw - default form creation failure shouldn't block org creation
    }

    await session.commitTransaction();
    session.endSession();

    // Generate invoice PDF attachment (best-effort; do not block purchase if it fails)
    let invoiceAttachments:
      | { filename: string; content: Buffer; contentType: string }[]
      | undefined;
    try {
      // const { buffer, filename } =
      //   await PaymentServices.generatePaymentInvoicePdf(String(payment?._id));
      // invoiceAttachments = [
      //   { filename, content: buffer, contentType: "application/pdf" },
      // ];
    } catch (pdfErr) {
      console.error(
        "Failed to generate invoice PDF for purchase confirmation email (non-fatal):",
        pdfErr
      );
      invoiceAttachments = undefined;
    }

    // initialize the org's credit account with twilio config balance
    // let initialCredit = 0;
    try {
      // const twilioConfig = await TwilioConfig.findOne();
      // initialCredit = twilioConfig?.initialCredit ?? 0;
    } catch (error) {
      console.error("Failed to fetch Twilio config for initial credit:", error);
    }

    try {
      // await CreditService.initializeCreditAccount(
      //   org._id,
      //   user._id,
      //   initialCredit
      // );
      // console.log(
      //   `✅ Credit account initialized with ${initialCredit} credits`
      // );
    } catch (creditError) {
      console.error(
        "Failed to initialize credit account (skipping):",
        creditError
      );
      // Continue with purchase even if credit initialization fails
    }

    // 6) Send confirmation email after commit — use DB template by ID with fallback
    try {
      const TEMPLATE_ID = production
        ? "690d86c0b62eeb7a8e033670"
        : "690875fa44f085591a76c904";
      // Purchase confirmation template

      const replacePlaceholders = (
        content: string,
        data: Record<string, unknown>
      ) => {
        if (!content) return "";
        let processed = content;
        // Support simple Handlebars-like if blocks: {{#if key}}...{{/if}}
        processed = processed.replace(
          /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
          (_m, key: string, inner: string) => {
            const val = (data as any)[key];
            return val ? inner : "";
          }
        );
        Object.keys(data).forEach((key) => {
          const value = String((data as any)[key] ?? "");
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          processed = processed.replace(regex, value);
        });
        processed = processed.replace(/{{now}}/g, new Date().toISOString());
        processed = processed.replace(/{{today}}/g, new Date().toDateString());
        processed = processed.replace(
          /{{currentYear}}/g,
          String(new Date().getFullYear())
        );
        processed = processed.replace(
          /{{year}}/g,
          String(new Date().getFullYear())
        );
        return processed;
      };

      const templateData = {
        orgName: payload.orgName,
        email: payload.orgEmail,
        password: rawPassword,
        invoiceId,
        // transactionId: paymentIntent.id,
        planName: plan.name,
        amount: plan.price,
        currentYear: new Date().getFullYear(),
      } as const;

      const dbTemplate = await OrgEmailTemplate.findById(
        TEMPLATE_ID
      ).withoutTenant();
      // if found, render and send via org email service (preferred)
      if (dbTemplate) {
        const subject = replacePlaceholders(
          dbTemplate.subject || "Your Organization Account Created",
          templateData
        );
        const html = replacePlaceholders(dbTemplate.body || "", templateData);

        try {
          // Use system sendEmail utility to send the rendered DB HTML (user requested)
          const { sendEmail } = await import("../../utils/sendEmail");
          await sendEmail({
            to: payload.orgEmail,
            subject,
            htmlContent: html,
            textContent: undefined,
            attachments: invoiceAttachments,
          });
        } catch (e) {
          // If system transporter fails, log and continue (purchase should not fail)
          console.error(
            "Failed to send purchase confirmation via system sendEmail:",
            e
          );
        }
      } else {
        // fallback to legacy template file
        const { sendEmail } = await import("../../utils/sendEmail");
        await sendEmail({
          to: payload.orgEmail,
          subject: "Your Organization Account Created",
          templateName: "purchase-confirmation",
          templateData: templateData as any,
          attachments: invoiceAttachments,
        });
      }
    } catch (emailError) {
      // Log error but don't fail the purchase flow
      console.error("Failed to send purchase confirmation email:", emailError);
    }

    // Log organization purchase
    if (logActor) {
      try {
        const actor = logActor as any;
        const actorDisplay = actor?.name || actor?.email || "system";
        await LogControllers.addLog(
          LOG_ACTIONS.ORGANIZATION_PURCHASED,
          actor?.userId || "system",
          `Organization purchased: Org='${org.orgName}' Plan='${plan.name}' Payment='${payment.transactionId}'`,
          logActor
        );
      } catch (logError) {
        console.error("Failed to log organization purchase:", logError);
      }
    }
    return {
      org,
      user: { id: user._id, email: user.email, role: user.role },
      payment,
    };
  } catch (dbErr) {
    // rollback transaction
    try {
      await session.abortTransaction();
    } catch (_) {
      // ignore
    } finally {
      session.endSession();
    }

    // best-effort refund because payment already succeeded
    try {
      // await stripe.refunds.create({ payment_intent: paymentIntent.id });
      
      // if (logActor) {
      //   await LogControllers.addLog(
      //     LOG_ACTIONS.PAYMENT_REFUNDED,
      //     logActor?.userId || "system",
      //     `Payment refunded due to DB error. Payment Intent: ${paymentIntent.id}, Error: ${dbErr}`,
      //     logActor
      //   );
      // }
    } catch (refundErr) {
      if (logActor) {
        await LogControllers.addLog(
          LOG_ACTIONS.REFUND_FAILED,
          logActor?.userId || "system",
          `Critical: Refund failed after DB error. DB Error: ${dbErr}, Refund Error: ${refundErr}`,
          logActor
        );
      }
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `DB error after payment; refund attempt failed. DB error: ${dbErr}`
      );
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `DB error after payment; payment refunded. Error: ${dbErr}`
    );
  }
};

const handleChangePlan = async (
  payload: ChangePlanPayload,
  logActor?: JwtPayload
) => {
  //console.log("[DEBUG] handleChangePlan called. logActor:", logActor);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find Org and Current Plan
    const org = await Org.findById(payload.orgId).session(session);
    if (!org) throw new AppError(404, "Organization not found");

    // Get the current plan before changing it
    const currentPlan = await Plan.findById(org.plan).session(session);

    // Ensure we have stripeCustomerId
    if (!org.stripeCustomerId) {
      throw new AppError(
        400,
        "Stripe customer ID not found for this organization"
      );
    }

    // Ensure we have an existing payment method
    if (
      !org.billingInfo?.paymentMethodId &&
      !payload.billingInfo?.paymentMethodId
    ) {
      throw new AppError(
        400,
        "No payment method available for this organization"
      );
    }

    // 2️⃣ Find New Plan
    const newPlan = await Plan.findById(payload.planId).session(session);
    if (!newPlan) throw new AppError(404, "Plan not found");

    // 3️⃣ Determine payment method to use
    let paymentMethodId = org?.billingInfo?.paymentMethodId;
    if (payload.billingInfo?.paymentMethodId) {
      paymentMethodId = payload.billingInfo.paymentMethodId;

      // Attach new payment method to existing Stripe customer
      // await stripe.paymentMethods.attach(paymentMethodId, {
      //   customer: org.stripeCustomerId,
      // });

      // Set as default payment method
      // await stripe.customers.update(org.stripeCustomerId, {
      //   invoice_settings: { default_payment_method: paymentMethodId },
      // });
    }

    // 4️⃣ Charge immediately for new plan
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(newPlan.price * 100),
    //   currency: "usd",
    //   customer: org.stripeCustomerId,
    //   payment_method: paymentMethodId,
    //   off_session: true,
    //   confirm: true,
    //   description: `Plan change to ${newPlan.name}`,
    //   metadata: {
    //     orgId: org._id.toString(),
    //     newPlanId: newPlan._id.toString(),
    //   },
    // });

    // if (paymentIntent.status !== "succeeded") {
    //   throw new AppError(400, "Payment failed while changing plan");
    // }

    // 5️⃣ Update Org's Plan and billing info for future cron charges
    const planStartDate = new Date();
    const nextBillingDate = new Date(planStartDate);

    switch (newPlan.durationUnit) {
      case DurationUnit.DAY:
        nextBillingDate.setDate(
          nextBillingDate.getDate() + newPlan.durationValue
        );
        break;
      case DurationUnit.WEEK:
        nextBillingDate.setDate(
          nextBillingDate.getDate() + newPlan.durationValue * 7
        );
        break;
      case DurationUnit.MONTH:
        nextBillingDate.setMonth(
          nextBillingDate.getMonth() + newPlan.durationValue
        );
        break;
      case DurationUnit.YEAR:
        nextBillingDate.setFullYear(
          nextBillingDate.getFullYear() + newPlan.durationValue
        );
        break;
    }

    org.plan = newPlan._id;
    org.billingInfo = { paymentMethodId: paymentMethodId as string };
    org.planStartDate = planStartDate;
    org.nextBillingDate = nextBillingDate;

    await org.save({ session });

    // 6️⃣ Create Payment Record
    const invoiceId = "INV-" + Date.now();
    // const payment = await Payment.create(
    //   [
    //     {
    //       org: org._id,
    //       plan: newPlan._id,
    //       amount: newPlan.price,
    //       status: "SUCCESS",
    //       transactionId: paymentIntent.id,
    //       invoiceId,
    //       description: "Plan Change",
    //       type: PaymentType.PLAN,
    //     },
    //   ],
    //   { session, ordered: true }
    // ).then((res) => res[0]);

    // 7️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Generate invoice PDF attachment (best-effort; do not block plan change if it fails)
    let invoiceAttachments:
      | { filename: string; content: Buffer; contentType: string }[]
      | undefined;
    try {
      // const { buffer, filename } =
      //   await PaymentServices.generatePaymentInvoicePdf(String(payment?._id));
      // invoiceAttachments = [
      //   { filename, content: buffer, contentType: "application/pdf" },
      // ];
    } catch (pdfErr) {
      console.error(
        "Failed to generate invoice PDF for plan change email (non-fatal):",
        pdfErr
      );
      invoiceAttachments = undefined;
    }

    // 8️⃣ Log the plan change
    // If controller didn't provide a JwtPayload via middleware, allow frontend to pass userId in payload
    //console.log("[DEBUG] Transaction committed, attempting to log plan change");

    // Enhanced logging with better error handling
    try {
      // await logPlanChange(org, currentPlan, newPlan, payment, logActor);
      //console.log("----------------------done--------------------");
    } catch (logError) {
      console.error(
        "[ERROR] Failed to log plan change after successful transaction:",
        logError
      );
    }

    // 9️⃣ Send Confirmation Email
    try {
      const { sendEmail } = await import("../../utils/sendEmail");
      await sendEmail({
        to: org.orgEmail,
        subject: "Your Plan Has Been Updated",
        templateName: "plan-change-confirmation",
        templateData: {
          orgName: org.orgName,
          planName: newPlan.name,
          amount: newPlan.price,
          invoiceId,
          // transactionId: paymentIntent.id,
          date: new Date().toLocaleDateString(),
          year: new Date().getFullYear(),
        } as any,
        attachments: invoiceAttachments,
      });
    } catch (systemEmailError) {
      console.error(
        "Failed to send plan change confirmation via system sendEmail (non-fatal):",
        systemEmailError
      );
    }

    // return { org, payment };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Renewal handler function
const handlePurchaseRenewal = async (orgId: string, logActor?: JwtPayload) => {
  const session = await mongoose.startSession();
  await session.startTransaction();

  let org: any = null;
  let payment: any = null;

  try {
    // 1) Find org and current plan
    org = await Org.findById(orgId).session(session);
    if (!org)
      throw new AppError(httpStatus.NOT_FOUND, "Organization not found");

    const plan = await Plan.findById(org.plan).session(session);
    if (!plan) throw new AppError(httpStatus.NOT_FOUND, "Plan not found");

    // 2) Check if payment method exists
    if (!org.billingInfo?.paymentMethodId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "No payment method available for renewal"
      );
    }

    if (!org.stripeCustomerId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "No Stripe customer ID found for renewal"
      );
    }

    // 3) Charge using existing Stripe customer
    // const idempotencyKey = `renewal_${org._id}_${Date.now()}`;
    // const paymentIntent = await stripe.paymentIntents.create(
    //   {
    //     amount: Math.round((plan.price ?? 0) * 100),
    //     currency: "usd",
    //     customer: org.stripeCustomerId,
    //     payment_method: org.billingInfo.paymentMethodId,
    //     off_session: true,
    //     confirm: true,
    //     description: `Renewal for ${plan.name} plan - ${org.orgName}`,
    //     metadata: {
    //       orgId: org._id.toString(),
    //       planId: plan._id.toString(),
    //       type: "renewal",
    //       orgName: org.orgName,
    //     },
    //   },
    //   { idempotencyKey }
    // );

    // if (paymentIntent.status !== "succeeded") {
    //   throw new AppError(httpStatus.BAD_REQUEST, "Renewal payment failed");
    // }

    // 4) Calculate new dates
    const newPlanStartDate = new Date();
    const newNextBillingDate = calculateNextBillingDate(newPlanStartDate, plan);

    // 5) Update org with new dates
    org.planStartDate = newPlanStartDate;
    org.nextBillingDate = newNextBillingDate;
    await org.save({ session });

    // 6) Create payment record
    const invoiceId = `REN-${Date.now()}`;
    // const paymentArr = await Payment.create(
    //   [
    //     {
    //       org: org._id,
    //       plan: plan._id,
    //       amount: plan.price,
    //       status: "SUCCESS",
    //       transactionId: paymentIntent.id,
    //       invoiceId,
    //       description: "Plan Renewal",
    //       type: PaymentType.PLAN,
    //     },
    //   ],
    //   { session, ordered: true }
    // );
    // payment = paymentArr[0];

    await session.commitTransaction();
    session.endSession();

    // Generate invoice PDF attachment (best-effort; do not block renewal if it fails)
    let invoiceAttachments:
      | { filename: string; content: Buffer; contentType: string }[]
      | undefined;
    try {
      // const { buffer, filename } = await PaymentServices.generatePaymentInvoicePdf(
      //   String(payment?._id)
      // );
      // invoiceAttachments = [
      //   { filename, content: buffer, contentType: "application/pdf" },
      // ];
    } catch (pdfErr) {
      console.error(
        "Failed to generate invoice PDF for renewal email (non-fatal):",
        pdfErr
      );
      invoiceAttachments = undefined;
    }

    // 7) Send renewal confirmation email
    try {
      // Renewal MUST NOT reuse the org-created template.
      // Prefer a dedicated system DB template (org=null) if present; otherwise fallback to templates/renewal-confirmation.ejs

      const replacePlaceholders = (
        content: string,
        data: Record<string, unknown>
      ) => {
        if (!content) return "";
        let processed = content;
        processed = processed.replace(
          /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
          (_m, key: string, inner: string) => {
            const val = (data as any)[key];
            return val ? inner : "";
          }
        );
        Object.keys(data).forEach((key) => {
          const value = String((data as any)[key] ?? "");
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          processed = processed.replace(regex, value);
        });
        processed = processed.replace(/{{now}}/g, new Date().toISOString());
        processed = processed.replace(/{{today}}/g, new Date().toDateString());
        processed = processed.replace(
          /{{currentYear}}/g,
          String(new Date().getFullYear())
        );
        processed = processed.replace(
          /{{year}}/g,
          String(new Date().getFullYear())
        );
        return processed;
      };

      const templateData = {
        orgName: org.orgName,
        email: org.orgEmail,
        invoiceId,
        // transactionId: paymentIntent.id,
        planName: plan.name,
        amount: plan.price,
        renewalDate: new Date().toLocaleDateString(),
        nextBillingDate: newNextBillingDate.toLocaleDateString(),
        currentYear: new Date().getFullYear(),
      } as const;

      // Try to find a dedicated renewal template in DB (system/global template: org=null)
      let dbTemplate = await OrgEmailTemplate.findOne({
        org: null,
        title: { $regex: /renewal-confirmation/i },
      }).withoutTenant();
      if (!dbTemplate) {
        dbTemplate = await OrgEmailTemplate.findOne({
          org: null,
          title: { $regex: /renewal/i },
        }).withoutTenant();
      }

      if (dbTemplate) {
        const subject = replacePlaceholders(
          dbTemplate.subject || "Your Plan Has Been Renewed",
          templateData
        );
        const html = replacePlaceholders(dbTemplate.body || "", templateData);

        try {
          const { sendEmail } = await import("../../utils/sendEmail");
          await sendEmail({
            to: org.orgEmail,
            subject,
            htmlContent: html,
            textContent: undefined,
            attachments: invoiceAttachments,
          });
        } catch (e) {
          console.error(
            "Failed to send renewal confirmation via system sendEmail:",
            e
          );
        }
      } else {
        // Fallback to basic email
        const { sendEmail } = await import("../../utils/sendEmail");
        await sendEmail({
          to: org.orgEmail,
          subject: "Your Plan Has Been Renewed",
          templateName: "renewal-confirmation",
          templateData: templateData as any,
          attachments: invoiceAttachments,
        });
      }
    } catch (emailError) {
      console.error("Failed to send renewal confirmation email:", emailError);
    }

    // 8) Log renewal success
    if (logActor) {
      try {
        const actor = logActor as any;
        const actorDisplay = actor?.name || actor?.email || "system";
        await LogControllers.addLog(
          LOG_ACTIONS.PLAN_RENEWED,
          actor?.userId || "system",
          `Plan renewed: Org='${org.orgName}' Plan='${plan.name}' Payment='${payment.transactionId}' Amount=$${plan.price}`,
          logActor
        );
      } catch (logError) {
        console.error("Failed to log plan renewal:", logError);
      }
    }

    return {
      org,
      payment,
      message: "Plan renewed successfully",
    };
  } catch (error) {
    // Rollback transaction on any error
    try {
      await session.abortTransaction();
    } catch (_) {
      // ignore
    } finally {
      session.endSession();
    }

    // Log renewal failure
    if (logActor) {
      try {
        const actor = logActor as any;
        await LogControllers.addLog(
          LOG_ACTIONS.RENEWAL_FAILED,
          actor?.userId || "system",
          `Renewal failed for org '${org?.orgName || orgId}': ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          logActor
        );
      } catch (logError) {
        console.error("Failed to log renewal failure:", logError);
      }
    }

    throw error;
  }
};

export const purchaseService = {
  handlePurchase,
  handleChangePlan,
  handlePurchaseRenewal,
  calculateNextBillingDate,
};
