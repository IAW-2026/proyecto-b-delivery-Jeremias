import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // exclude _next, static files and the Clerk auth routes (signin/callbacks)
  matcher: ["/((?!.*\\..*|_next|signin).*)"],
};
