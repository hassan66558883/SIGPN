import { apiOk, withApi } from "@/server/api";
import { logout } from "@/server/auth/login";
import { clearSessionCookie, SESSION_COOKIE } from "@/server/auth/session";

export const POST = withApi({}, async ({ actor, ctx, req }) => {
  await logout(actor, req.cookies.get(SESSION_COOKIE)?.value, ctx);
  await clearSessionCookie();
  return apiOk({ authenticated: false });
});
