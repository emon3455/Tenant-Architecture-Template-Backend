/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Make sure this file is included by "typeRoots" or "include" in tsconfig
import "mongoose";

declare module "mongoose" {
  interface QueryOptions {
    /** Custom option we use to bypass tenant scoping */
    skipTenant?: boolean;
  }
  interface AggregateOptions {
    /** Custom option we use to bypass tenant scoping */
    skipTenant?: boolean;
  }

  // Expose the helper so TS knows about it on queries
  interface Query<ResultType = any, DocType = any, THelpers = any, RawDocType = DocType, TInstanceMethods = unknown, TQueryHelpers = any> {
    withoutTenant(): this;
  }
}
