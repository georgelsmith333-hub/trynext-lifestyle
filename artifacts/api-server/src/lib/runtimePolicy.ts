export type RuntimeRole = "primary" | "promoted" | "standby" | "dr" | string;

export const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function mutationsAllowedForRole(role: RuntimeRole): boolean {
  return role === "primary" || role === "promoted";
}

export function shouldRejectMutation(role: RuntimeRole, method: string): boolean {
  return MUTATION_METHODS.has(method.toUpperCase()) && !mutationsAllowedForRole(role);
}
