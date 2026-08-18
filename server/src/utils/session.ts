import { randomUUID } from "crypto";

export function generateSessionToken(): string {
  return randomUUID();
}

export function generatePlayerId(): string {
  return randomUUID();
}
