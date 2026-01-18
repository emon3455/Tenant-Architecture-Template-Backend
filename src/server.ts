/* eslint-disable no-console */
// import { Server } from "http";
import http from "http";
import mongoose from "mongoose";
import app from "./app";
import { envVars } from "./app/config/env";
// import { seedSuperAdmin } from "./app/utils/seedSuperAdmin"; // REMOVED - file not found
// import { SchedulerService } from "./app/modules/automation/automation.scheduler"; // REMOVED - automation module deleted
// import * as jobScheduler from "./app/schedulers"; // REMOVED - schedulers folder deleted

let server: http.Server;

const startServer = async () => {
  try {
    await mongoose.connect(envVars.DB_URL);

    console.log("✅ Connected to Database");

    // Drop old unique index from Note collection if it exists
    try {
      const Note = mongoose.connection.collection('notes');
      await Note.dropIndex('job_1_role_1');
      console.log("✅ Dropped old unique index from notes collection");
    } catch (error) {
      if ((error as { codeName?: string }).codeName === 'IndexNotFound') {
        // console.log("ℹ️  Old unique index not found (already migrated)");
      }
      // Ignore other errors - index might not exist
    }

    // Create HTTP server
    server = http.createServer(app);

    // Listen on the server
    server.listen(envVars.PORT, () => {
      console.log(`🚀 Server is listening on port ${envVars.PORT}`);
      // console.log(`📡 API Base URL: http://localhost:${envVars.PORT}`);
     
    });
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  await startServer();
})();

process.on("SIGTERM", () => {


  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal recieved... Server shutting down..");
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejecttion detected... Server shutting down..", err);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception detected... Server shutting down..", err);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});
