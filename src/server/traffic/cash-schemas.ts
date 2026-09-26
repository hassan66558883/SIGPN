import { z } from "zod";
import { optionalDate, optionalText } from "@/server/action-utils";

export const CASH_DEPOSIT_METHODS = ["BANK", "TREASURY", "CENTRAL_CASH", "MOBILE_MONEY", "OTHER"] as const;
export const CASH_REGISTER_STATUSES = ["OPEN", "CLOSED", "PENDING_DEPOSIT", "DEPOSITED", "VALIDATED", "BLOCKED"] as const;
export const CASH_DEPOSIT_STATUSES = ["SUBMITTED", "VERIFIED", "JUSTIFICATION_REQUESTED", "VALIDATED", "REJECTED"] as const;
export const CASH_RECONCILIATION_STATUSES = ["PENDING", "CONFORME", "GAP_TO_JUSTIFY", "VALIDATED", "REJECTED"] as const;
export const CASH_DISCREPANCY_STATUSES = ["OPEN", "JUSTIFIED", "VALIDATED", "REJECTED"] as const;
export const CASH_COLLECTION_STATUSES = ["TO_DEPOSIT", "PARTIALLY_DEPOSITED", "DEPOSITED", "VALIDATED"] as const;

const money = (label: string) => z.coerce.number().int().min(0, `${label} must be positive`).max(1_000_000_000);
const reason = z.string().trim().min(10, "min 10 characters").max(1000);

export const openRegisterSchema = z.object({
  openingBalanceFcfa: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), money("opening balance")),
  notes: optionalText(500),
});
export type OpenRegisterInput = z.infer<typeof openRegisterSchema>;

export const closeRegisterSchema = z.object({ registerId: z.string().min(1), notes: optionalText(500) });
export type CloseRegisterInput = z.infer<typeof closeRegisterSchema>;

export const blockRegisterSchema = z.object({ registerId: z.string().min(1), op: z.enum(["block", "unblock"]), reason });
export type BlockRegisterInput = z.infer<typeof blockRegisterSchema>;

export const verifyClosureSchema = z.object({ collectionId: z.string().min(1) });

export const depositSchema = z.object({
  collectionId: z.string().min(1),
  amountDepositedFcfa: z.coerce.number().int().min(1, "amount required").max(1_000_000_000),
  method: z.enum(CASH_DEPOSIT_METHODS),
  slipNumber: optionalText(80),
  reference: optionalText(80),
  recipient: optionalText(160),
  depositedAt: optionalDate,
  observations: optionalText(1000),
});
export type DepositInput = z.infer<typeof depositSchema>;

export const depositReviewSchema = z.object({
  depositId: z.string().min(1),
  op: z.enum(["verify", "request_justification", "reject", "validate"]),
  note: optionalText(1000),
});
export type DepositReviewInput = z.infer<typeof depositReviewSchema>;

export const depositRespondSchema = z.object({ depositId: z.string().min(1), note: z.string().trim().min(5, "min 5 characters").max(1000) });
export type DepositRespondInput = z.infer<typeof depositRespondSchema>;

export const reconciliationActionSchema = z.object({
  collectionId: z.string().min(1),
  op: z.enum(["finalize", "reject", "declare_gap"]),
  note: optionalText(1000),
});
export type ReconciliationActionInput = z.infer<typeof reconciliationActionSchema>;

export const discrepancyActionSchema = z.object({
  discrepancyId: z.string().min(1),
  op: z.enum(["justify", "validate", "reject"]),
  reason: optionalText(500),
  text: optionalText(2000),
});
export type DiscrepancyActionInput = z.infer<typeof discrepancyActionSchema>;

export const REPORT_KINDS = ["daily", "weekly", "monthly", "by_agent", "by_unit", "by_commissariat", "by_province", "deposits", "discrepancies", "collected_vs_deposited", "by_method", "unpaid_fines"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
