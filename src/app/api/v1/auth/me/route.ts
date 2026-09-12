import { apiOk, withApi } from "@/server/api";

export const GET = withApi({}, async ({ actor }) => {
  return apiOk({
    id: actor.id,
    username: actor.username,
    email: actor.email,
    firstName: actor.firstName,
    lastName: actor.lastName,
    role: { code: actor.roleCode, name: actor.roleName, scopeLevel: actor.scopeLevel },
    regionId: actor.regionId,
    stationId: actor.stationId,
    mfaEnabled: actor.mfaEnabled,
    authMethod: actor.authMethod,
    permissions: Array.from(actor.permissions).sort(),
  });
});
