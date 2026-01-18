import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import expressSession from "express-session";
import passport from "passport";
import { envVars } from "./app/config/env";
import "./app/config/passport";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";
import { router } from "./app/routes";
import { name } from "./app/constant/constant";
import { withRequestContext } from "./app/lib/tenantContext";
import fs from "fs";
import path from "path";
// import { seedOrgPolicyFromFeatures } from "./app/modules/orgFeaturePolicy/orgFeaturePolicy.service";
// import { assignAllFeaturesToSuperAdmin, runSuperAdminFeatureAssignment } from "./app/utils/seedFeatures";
// import { runPipelineTemplateSeeder } from "./app/modules/pipeline/pipeline.templates"; // REMOVED - pipeline module deleted
// import { startTaskDeadlineCron } from "./app/modules/task/task.cron"; // REMOVED - task module deleted
// import { RecurringTaskCron } from "./app/utils/recurringTasksCron"; // REMOVED - file deleted

const app = express()

// Trust proxy - required for production behind reverse proxy (Nginx)
app.set('trust proxy', 1);

app.use(expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(cookieParser())
app.use(express.json())
app.use(cors({
    origin: [
        envVars.FRONTEND_URL,
        "http://localhost:5174",
        "https://app.tainc.org",
        "https://crm.octopi-digital.com"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 200
}))

app.use(withRequestContext);

app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


app.use("/uploads", express.static("uploads"));

const upload = path.join(__dirname, "../uploads/videos");
app.use("/uploads/videos", express.static(upload));

const jobAttachmentsUpload = path.join(__dirname, "../uploads/job-attachments");
app.use("/uploads/job-attachments", express.static(jobAttachmentsUpload));

const supportTicketAttachmentsUpload = path.join(__dirname, "../uploads/support-ticket-attachments");
app.use("/uploads/support-ticket-attachments", express.static(supportTicketAttachmentsUpload));

const noteAttachmentsUpload = path.join(__dirname, "../uploads/note-attachments");
app.use("/uploads/note-attachments", express.static(noteAttachmentsUpload));


app.use("/api/v1", router)

app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: `Welcome to ${name} System Backend`
    })
})

app.use(globalErrorHandler)

app.use(notFound)

export default app
