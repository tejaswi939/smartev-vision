import type { PrismaClient, AuditAction } from "@prisma/client";
import type { Request } from "express";

export interface AuditInput {
  actorUserId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: unknown;
  req?: Request;
}

export async function audit(prisma: PrismaClient, input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: (input.metadata ?? undefined) as never,
      ip: input.req?.ip,
      userAgent: input.req?.get("user-agent") ?? undefined,
    },
  });
}
