import { Router } from "express"
import { AuthRoutes } from "../modules/auth/auth.route"
import { UserRoutes } from "../modules/user/user.route"
import { OtpRoutes } from "../modules/otp/otp.route"
import { PlanRoutes } from "../modules/plan/plan.routes"
import { OrgRoutes } from "../modules/org/org.routes"
import { OrgSettingsRoutes } from "../modules/orgSettings/orgSettings.route";
import { UploadRoutes } from "../modules/uploads/upload.routes"

import { EmailConfigRoutes } from "../modules/org/emailConfig.routes"
import emailRoutes from "../modules/email/email.routes"
import { EmailLogRoutes } from "../modules/emailLog/emailLog.routes"
import { LogRoutes } from "../modules/log/log.routes"
import { ContactRoutes } from "../modules/contact/contact.route"
import EmailTemplateRoutes from "../modules/emailTemplate/emailTemplate.routes"
import { PurchaseRoutes } from "../modules/purchase/purchase.route"
import { PaymentFailedLogRoutes } from "../modules/paymentFailedLog/paymentFailedLog.routes"
import { PaymentRoutes } from "../modules/payment/payment.routes"
export const router = Router()

const moduleRoutes = [
    {
        path: "/user",
        route: UserRoutes
    },
    {
        path: "/auth",
        route: AuthRoutes
    },
    {
        path: "/otp",
        route: OtpRoutes
    },
    {
        path: "/plan",
        route: PlanRoutes
    },
    {
        path: "/org",
        route: OrgRoutes
    },
    {
        path: "/org-settings",
        route: OrgSettingsRoutes
    },
    {
        path: "/payments",
        route: PaymentRoutes
    },
    {
        path: "/purchase",
        route: PurchaseRoutes
    },
    {
        path: "/upload",
        route: UploadRoutes
    },
    {
        path: "/email-config",
        route: EmailConfigRoutes
    },
    {
        path: "/email",
        route: emailRoutes
    },
    {
        path: "/email-logs",
        route: EmailLogRoutes
    },
    {
        path: "/logs",
        route: LogRoutes
    },
    {
        path: "/payment-failed-logs",
        route: PaymentFailedLogRoutes
    },
    {
        path: "/contacts",
        route: ContactRoutes
    },
    {
        path: "/email-templates",
        route: EmailTemplateRoutes
    },
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})