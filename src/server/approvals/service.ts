import "server-only";
import type { ApprovalKind, ApprovalStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { logAudit } from "@/server/audit";
import { BusinessError, NotFoundError } from "@/server/errors";
import { buildActor, loadUserRow, type Actor } from "@/server/auth/dal";
import { hashPassword } from "@/server/auth/password";
import type { RequestContext } from "@/server/request-context";
import { notifyPermission, notify } from "@/server/notifications";
import { LOCKED_ROLE_CODES } from "@/server/rbac/roles";
import { isPermission } from "@/server/rbac/permissions";
import { isSensitivePermission, type Clearance } from "@/server/rbac/sensitivity";
import { assertCanGrantRole, assertCanSetClearance, checkUserCreation, createUser, getUser, updateUser, type UserCreateInput, type UserUpdateInput } from "@/server/admin/users";
import { getRole, setRolePermissions } from "@/server/admin/roles";
import { APPROVAL_TTL_DAYS, approvalsForAccount, isClearanceRaise, whyCannotDecide, type Approver, type ApprovalTarget, type PriorApproval, type ScopeName } from "@/server/approvals/rules";

/**
 * Approval workflow (security audit, lot 4). A sensitive change is REQUESTED, approved by one or two authorised people, and only
 * then executed, as the requester, through the same service function that a direct change would have used. The routes and screens
 * call the `submit*` functions below; the direct functions (`createUser`, `updateUser`, `setRolePermissions`) are executors.
 */

const requestSelect = {
  id: true,
  kind: true,
  status: true,
  requiredApprovals: true,
  summary: true,
  payload: true,
  targetUserId: true,
  targetRoleId: true,
  regionId: true,
  adminDepartmentId: true,
  stationId: true,
  requestedById: true,
  requestedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
  expiresAt: true,
  decidedAt: true,
  executedAt: true,
  failureReason: true,
  resultEntityId: true,
  createdAt: true,
  decisions: { orderBy: { createdAt: "asc" as const }, select: { id: true, vote: true, comment: true, approverScope: true, createdAt: true, approverId: true, approver: { select: { id: true, username: true, firstName: true, lastName: true } } } },
} satisfies Prisma.ApprovalRequestSelect;

type RequestRow = Prisma.ApprovalRequestGetPayload<{ select: typeof requestSelect }>;

const approverOf = (a: Actor): Approver => ({ id: a.id, scopeLevel: a.scopeLevel as ScopeName, regionId: a.regionId, adminDepartmentId: a.adminDepartmentId, stationIds: a.stationIds, permissions: a.permissions });
const targetOf = (r: Pick<RequestRow, "kind" | "requiredApprovals" | "requestedById" | "targetUserId" | "regionId" | "adminDepartmentId" | "stationId">): ApprovalTarget => ({ kind: r.kind, requiredApprovals: r.requiredApprovals, requestedById: r.requestedById, targetUserId: r.targetUserId, regionId: r.regionId, adminDepartmentId: r.adminDepartmentId, stationId: r.stationId });
const priorOf = (r: RequestRow): PriorApproval[] => r.decisions.map((d) => ({ approverId: d.approverId, approverScope: d.approverScope as ScopeName, vote: d.vote }));

async function createRequest(actor: Actor, ctx: RequestContext, data: { kind: ApprovalKind; requiredApprovals: 1 | 2; summary: string; payload: Prisma.InputJsonValue; targetUserId?: string | null; targetRoleId?: string | null; regionId?: string | null; adminDepartmentId?: string | null; stationId?: string | null }) {
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_DAYS * 86_400_000);
  const r = await prisma.$transaction(async (tx) => {
    const created = await tx.approvalRequest.create({
      data: { kind: data.kind, requiredApprovals: data.requiredApprovals, summary: data.summary.slice(0, 500), payload: data.payload, targetUserId: data.targetUserId ?? null, targetRoleId: data.targetRoleId ?? null, regionId: data.regionId ?? null, adminDepartmentId: data.adminDepartmentId ?? null, stationId: data.stationId ?? null, requestedById: actor.id, expiresAt },
      select: requestSelect,
    });
    await logAudit({ actor, action: "APPROVAL_REQUESTED", module: "approvals", entityType: "ApprovalRequest", entityId: created.id, entityLabel: created.kind, summary: `Approval requested (${created.kind}, ${created.requiredApprovals} needed): ${created.summary}`, after: { kind: created.kind, requiredApprovals: created.requiredApprovals, targetUserId: created.targetUserId }, context: ctx }, tx);
    return created;
  });
  await notifyPermission({ permission: "approvals:decide", title: "Approval request", body: "A sensitive change awaits your decision.", href: "/approvals", excludeUserId: actor.id });
  return r;
}

// ---------------------------------------------------------------- requests

/** Account creation: always a request (one approval, or two when the role or the clearance is sensitive). */
export async function submitUserCreate(actor: Actor, input: UserCreateInput, ctx: RequestContext) {
  const { role, placement, clearance } = await checkUserCreation(actor, input);
  const rolePermissions = (await prisma.role.findUnique({ where: { id: role.id }, select: { permissions: { select: { permission: { select: { code: true } } } } } }))!.permissions.map((p) => p.permission.code);
  const required = approvalsForAccount({ roleCode: role.code, rolePermissions, clearance });
  // The temporary password is checked now and stored hashed: no plaintext secret sits in an approval request.
  const passwordHash = await hashPassword(input.temporaryPassword);
  const { temporaryPassword: _pw, ...safeInput } = input;
  void _pw;
  return createRequest(actor, ctx, {
    kind: "USER_CREATE",
    requiredApprovals: required,
    summary: `Create account ${input.username} (${role.code})`,
    payload: { input: safeInput, passwordHash } as Prisma.InputJsonValue,
    regionId: placement.regionId,
    adminDepartmentId: placement.adminDepartmentId,
    stationId: placement.stationId,
  });
}

/**
 * Account update. The profile fields apply at once; a CHANGE OF ROLE and a RAISE of the clearance become approval requests
 * (lowering a clearance takes effect immediately). Returns the account as it is now and the requests created.
 */
export async function submitUserUpdate(actor: Actor, id: string, input: UserUpdateInput, ctx: RequestContext) {
  const before = await getUser(actor, id);
  const roleChanged = before.roleId !== input.roleId;
  const raise = input.clearance !== undefined && isClearanceRaise(before.clearance as Clearance, input.clearance);
  const requests: RequestRow[] = [];
  const placement = { regionId: before.regionId, adminDepartmentId: before.adminDepartmentId, stationId: before.stationId };

  if (roleChanged) {
    if (id === actor.id) throw new BusinessError("You cannot change your own role.", "STATE");
    const role = await assertCanGrantRole(actor, input.roleId);
    const rolePermissions = (await prisma.role.findUnique({ where: { id: role.id }, select: { permissions: { select: { permission: { select: { code: true } } } } } }))!.permissions.map((p) => p.permission.code);
    const required = approvalsForAccount({ roleCode: role.code, rolePermissions, clearance: before.clearance as Clearance });
    requests.push(await createRequest(actor, ctx, { kind: "USER_ROLE_CHANGE", requiredApprovals: required, summary: `Change the role of ${before.username}: ${before.role.code} → ${role.code}`, payload: { roleId: role.id, roleCode: role.code } as Prisma.InputJsonValue, targetUserId: id, ...placement }));
  }
  if (raise) {
    if (id === actor.id) throw new BusinessError("You cannot change your own security clearance.", "STATE");
    assertCanSetClearance(actor);
    requests.push(await createRequest(actor, ctx, { kind: "USER_CLEARANCE_RAISE", requiredApprovals: 2, summary: `Raise the security clearance of ${before.username}: ${before.clearance} → ${input.clearance}`, payload: { clearance: input.clearance } as Prisma.InputJsonValue, targetUserId: id, ...placement }));
  }
  const user = await updateUser(actor, id, { ...input, roleId: before.roleId, clearance: raise ? undefined : input.clearance }, ctx);
  return { user, requests };
}

/**
 * Role permissions. Removing permissions, or adding ordinary ones, applies at once; ADDING a sensitive permission needs two
 * approvers with national authority. The two administrator roles stay locked.
 */
export async function submitRolePermissions(actor: Actor, roleId: string, codes: string[], ctx: RequestContext) {
  const before = await getRole(roleId);
  if (LOCKED_ROLE_CODES.includes(before.code)) throw new BusinessError("The system administrator roles are fixed by the system and cannot be edited.", "STATE");
  const wanted: string[] = Array.from(new Set(codes.filter(isPermission)));
  const added = wanted.filter((c) => !before.permissionCodes.includes(c));
  const sensitiveAdded = added.filter(isSensitivePermission);
  const excess = sensitiveAdded.filter((c) => !actor.permissions.has(c));
  if (excess.length) throw new BusinessError(`You cannot grant permissions you do not hold: ${excess.slice(0, 5).join(", ")}${excess.length > 5 ? "…" : ""}.`, "STATE");
  const immediate = wanted.filter((c) => !sensitiveAdded.includes(c));
  const changesNow = immediate.length !== before.permissionCodes.length || immediate.some((c) => !before.permissionCodes.includes(c));
  if (changesNow || sensitiveAdded.length === 0) await setRolePermissions(actor, roleId, immediate, ctx);
  if (sensitiveAdded.length === 0) return { applied: true as const, request: null };
  const request = await createRequest(actor, ctx, { kind: "ROLE_PERMISSIONS_ADD", requiredApprovals: 2, summary: `Add sensitive permission(s) to the role ${before.code}: ${sensitiveAdded.join(", ")}`, payload: { roleId, permissions: sensitiveAdded } as Prisma.InputJsonValue, targetRoleId: roleId });
  return { applied: false as const, request };
}

// ---------------------------------------------------------------- reading

async function expireStale(ctx?: RequestContext) {
  const stale = await prisma.approvalRequest.findMany({ where: { status: "PENDING", expiresAt: { lt: new Date() } }, select: { id: true, summary: true } });
  for (const s of stale) {
    const r = await prisma.approvalRequest.updateMany({ where: { id: s.id, status: "PENDING" }, data: { status: "EXPIRED", decidedAt: new Date() } });
    if (r.count) await logAudit({ actor: null, action: "APPROVAL_EXPIRED", module: "approvals", entityType: "ApprovalRequest", entityId: s.id, summary: `Approval request expired: ${s.summary}`, context: ctx ?? null });
  }
}

/** What leaves the service: the payload (which holds the hashed temporary password) never does. */
export type ApprovalItem = Omit<RequestRow, "payload"> & { canDecide: boolean; cannotBecause: string | null; approvalsSoFar: number };
export const presentApproval = (a: Actor, r: RequestRow): ApprovalItem => {
  const why = r.status === "PENDING" ? whyCannotDecide(approverOf(a), targetOf(r), priorOf(r)) : "Closed";
  const { payload: _payload, ...rest } = r;
  void _payload;
  return { ...rest, canDecide: why === null, cannotBecause: why, approvalsSoFar: r.decisions.filter((d) => d.vote === "APPROVE").length };
};
const present = presentApproval;

/** `todo`: pending requests this actor may decide. `mine`: requests the actor made. `all`: every request (security oversight). */
export async function listApprovals(actor: Actor, view: "todo" | "mine" | "all", opts: { status?: ApprovalStatus } = {}) {
  await expireStale();
  if (view === "all" && !actor.permissions.has("security:manage")) throw new BusinessError("Only the security administrator can see every approval request.", "STATE");
  const where: Prisma.ApprovalRequestWhereInput = view === "mine" ? { requestedById: actor.id } : view === "todo" ? { status: "PENDING" } : {};
  const rows = await prisma.approvalRequest.findMany({ where: { ...where, ...(opts.status ? { status: opts.status } : {}) }, orderBy: { createdAt: "desc" }, take: 200, select: requestSelect });
  const items = rows.map((r) => present(actor, r));
  return view === "todo" ? items.filter((i) => i.canDecide) : items;
}

export async function getApproval(actor: Actor, id: string): Promise<ApprovalItem> {
  await expireStale();
  const r = await prisma.approvalRequest.findUnique({ where: { id }, select: requestSelect });
  if (!r) throw new NotFoundError("Approval request");
  const item = present(actor, r);
  const seesAll = actor.permissions.has("security:manage");
  if (!(seesAll || r.requestedById === actor.id || item.canDecide || r.decisions.some((d) => d.approverId === actor.id))) throw new NotFoundError("Approval request");
  return item;
}

// ---------------------------------------------------------------- deciding

export async function decideApproval(actor: Actor, id: string, vote: "APPROVE" | "REJECT", comment: string | undefined, ctx: RequestContext) {
  if (!actor.permissions.has("approvals:decide")) throw new BusinessError("You are not authorised to decide approvals.", "STATE");
  const note = comment?.trim() || undefined;
  if (vote === "REJECT" && !note) throw new BusinessError("A rejection needs a comment.", "VALIDATION", { comment: "required" });
  await expireStale(ctx);
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ApprovalRequest" WHERE "id" = ${id} FOR UPDATE`; // one decision at a time per request
    const r = await tx.approvalRequest.findUnique({ where: { id }, select: requestSelect });
    if (!r) throw new NotFoundError("Approval request");
    if (r.status !== "PENDING") throw new BusinessError(`This request is ${r.status.toLowerCase()} and can no longer be decided.`, "STATE");
    const why = whyCannotDecide(approverOf(actor), targetOf(r), priorOf(r));
    if (why) throw new BusinessError(why, "STATE");
    await tx.approvalDecision.create({ data: { requestId: id, approverId: actor.id, vote, comment: note ?? null, approverScope: actor.scopeLevel } });
    const approvals = r.decisions.filter((d) => d.vote === "APPROVE").length + (vote === "APPROVE" ? 1 : 0);
    const status: ApprovalStatus = vote === "REJECT" ? "REJECTED" : approvals >= r.requiredApprovals ? "APPROVED" : "PENDING";
    if (status !== "PENDING") await tx.approvalRequest.update({ where: { id }, data: { status, decidedAt: new Date() } });
    await logAudit({ actor, action: vote === "APPROVE" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED", module: "approvals", entityType: "ApprovalRequest", entityId: id, entityLabel: r.kind, summary: `${vote === "APPROVE" ? "Approved" : "Rejected"} (${approvals}/${r.requiredApprovals}): ${r.summary}`, after: { vote, comment: note, approvals, required: r.requiredApprovals, status }, context: ctx }, tx);
    return { status, requestedById: r.requestedById, summary: r.summary };
  });
  if (outcome.status === "APPROVED") await executeApproved(id, ctx);
  else if (outcome.status === "REJECTED") await notify({ userId: outcome.requestedById, kind: "INFO", title: "Approval rejected", body: `Your request was rejected: ${outcome.summary}`, href: "/approvals" });
  return getApproval(actor, id);
}

export async function cancelApproval(actor: Actor, id: string, ctx: RequestContext) {
  const r = await prisma.approvalRequest.findUnique({ where: { id }, select: { id: true, status: true, requestedById: true, summary: true } });
  if (!r || r.requestedById !== actor.id) throw new NotFoundError("Approval request");
  const done = await prisma.approvalRequest.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED", decidedAt: new Date() } });
  if (!done.count) throw new BusinessError(`This request is ${r.status.toLowerCase()} and cannot be cancelled.`, "STATE");
  await logAudit({ actor, action: "APPROVAL_CANCELLED", module: "approvals", entityType: "ApprovalRequest", entityId: id, summary: `Approval request cancelled: ${r.summary}`, context: ctx });
  return getApproval(actor, id);
}

// ---------------------------------------------------------------- executing

async function requesterActor(userId: string): Promise<Actor | null> {
  const row = await loadUserRow(userId);
  return row ? buildActor(row, { id: null, mfaVerified: true }, "api_key") : null;
}

/** Replays the approved change as its requester. The request left PENDING under a row lock, so exactly one caller gets here. */
async function executeApproved(id: string, ctx: RequestContext) {
  const r = await prisma.approvalRequest.findUnique({ where: { id }, select: requestSelect });
  if (!r || r.status !== "APPROVED") return;
  let resultEntityId: string | null = null;
  let failure: string | null = null;
  try {
    const requester = await requesterActor(r.requestedById);
    if (!requester) throw new BusinessError("The requester's account is no longer active.", "STATE");
    const payload = r.payload as Record<string, any>;
    switch (r.kind) {
      case "USER_CREATE": {
        const created = await createUser(requester, payload.input as UserCreateInput, ctx, { passwordHash: payload.passwordHash as string });
        resultEntityId = created.id;
        break;
      }
      case "USER_ROLE_CHANGE":
      case "USER_CLEARANCE_RAISE": {
        const u = await getUser(requester, r.targetUserId!);
        const input: UserUpdateInput = { email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? undefined, roleId: r.kind === "USER_ROLE_CHANGE" ? (payload.roleId as string) : u.roleId, regionId: u.regionId ?? undefined, adminDepartmentId: u.adminDepartmentId ?? undefined, stationId: u.stationId ?? undefined, clearance: r.kind === "USER_CLEARANCE_RAISE" ? (payload.clearance as Clearance) : undefined };
        await updateUser(requester, r.targetUserId!, input, ctx);
        resultEntityId = r.targetUserId;
        break;
      }
      case "ROLE_PERMISSIONS_ADD": {
        const role = await getRole(payload.roleId as string);
        await setRolePermissions(requester, role.id, Array.from(new Set([...role.permissionCodes, ...(payload.permissions as string[])])), ctx);
        resultEntityId = role.id;
        break;
      }
    }
  } catch (e) {
    failure = e instanceof Error ? e.message : "The approved change could not be executed.";
  }
  await prisma.approvalRequest.update({ where: { id }, data: failure ? { status: "FAILED", failureReason: failure.slice(0, 500) } : { status: "EXECUTED", executedAt: new Date(), resultEntityId } });
  await logAudit({ actor: null, action: failure ? "APPROVAL_FAILED" : "APPROVAL_EXECUTED", module: "approvals", entityType: "ApprovalRequest", entityId: id, entityLabel: r.kind, summary: failure ? `Approved change NOT executed (${failure}): ${r.summary}` : `Approved change executed: ${r.summary}`, outcome: failure ? "FAILURE" : "SUCCESS", context: ctx });
  await notify({ userId: r.requestedById, kind: "INFO", title: failure ? "Approved change not executed" : "Approved change executed", body: failure ? `${r.summary}: ${failure}` : r.summary, href: "/approvals" });
}

