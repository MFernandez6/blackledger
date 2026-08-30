import type { StaffRole } from "@/lib/types";

export function canWriteFinance(role: StaffRole): boolean {
  return role === "ADMIN" || role === "FINANCE";
}

export function canEditSchedules(role: StaffRole): boolean {
  return role === "ADMIN";
}
