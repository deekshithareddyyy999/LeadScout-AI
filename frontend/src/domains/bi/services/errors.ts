export type ServiceErrorKind = "setup" | "not-found" | "too-broad" | "rate-limit" | "timeout" | "network";

/** A user-presentable failure from a data service. `kind` drives which state the UI shows. */
export class ServiceError extends Error {
  kind: ServiceErrorKind;

  constructor(kind: ServiceErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "ServiceError";
  }
}

export const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

export function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  return new ServiceError("network", "The data service couldn't be reached. Check your connection and try again.");
}
