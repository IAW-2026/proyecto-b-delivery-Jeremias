import { clerkMiddleware } from "@clerk/nextjs/server";

export const proxy = clerkMiddleware();

export default proxy;

export const config = {
  matcher: ["/((?!.*\\..*|_next|signin).*)"],
};
