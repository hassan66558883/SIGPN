/** Errors thrown by the service layer; adapters translate them to FormState or HTTP. */

export class AuthError extends Error {
  constructor(
    public readonly kind: "unauthenticated" | "forbidden" | "mfa_required" | "password_change_required",
    message?: string,
  ) {
    super(message ?? kind);
    this.name = "AuthError";
  }
}

export class BusinessError extends Error {
  constructor(
    message: string,
    public readonly code: "CONFLICT" | "VALIDATION" | "STATE" = "VALIDATION",
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

export class NotFoundError extends Error {
  constructor(entity = "Record") {
    super(`${entity} not found or outside your scope.`);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitError";
  }
}

export function business(message: string, code: BusinessError["code"] = "VALIDATION"): never {
  throw new BusinessError(message, code);
}
