import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ActivityActorType,
  ActivityLog,
  ActivityType,
} from './activity.schema';

export interface ActivityMeta {
  ip: string;
  userAgent: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityModel: Model<ActivityLog>,
  ) {}

  async logWorkspaceAccess(
    workspaceId: string,
    actorType: ActivityActorType,
    meta: ActivityMeta,
  ): Promise<void> {
    await this.createLog({
      workspaceId,
      activityType: ActivityType.WORKSPACE_ACCESS,
      actorType,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async logFileView(
    workspaceId: string,
    documentId: string,
    documentName: string,
    actorType: ActivityActorType,
    meta: ActivityMeta,
  ): Promise<void> {
    await this.createLog({
      workspaceId,
      activityType: ActivityType.FILE_VIEW,
      documentId,
      documentName,
      actorType,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async logFileDownload(
    workspaceId: string,
    documentId: string,
    documentName: string,
    actorType: ActivityActorType,
    meta: ActivityMeta,
  ): Promise<void> {
    await this.createLog({
      workspaceId,
      activityType: ActivityType.FILE_DOWNLOAD,
      documentId,
      documentName,
      actorType,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async listByWorkspace(workspaceId: string, limit = 500): Promise<ActivityLog[]> {
    try {
      return await this.activityModel
        .find({ workspaceId: new Types.ObjectId(workspaceId) })
        .sort({ createdAt: -1 })
        .limit(Math.max(1, Math.min(limit, 5000)))
        .exec();
    } catch {
      return [];
    }
  }

  resolveRequestMeta(req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  }): ActivityMeta {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    const firstForwardedIp = forwardedValue?.split(',')[0]?.trim();
    const rawIp = firstForwardedIp || req.ip || 'unknown';
    const ip = rawIp.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;

    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader.join(', ')
      : (userAgentHeader ?? 'unknown');

    return {
      ip: ip.slice(0, 120),
      userAgent: userAgent.slice(0, 1024),
    };
  }

  private async createLog(params: {
    workspaceId: string;
    activityType: ActivityType;
    actorType: ActivityActorType;
    ip: string;
    userAgent: string;
    documentId?: string;
    documentName?: string;
  }): Promise<void> {
    try {
      const payload: {
        workspaceId: Types.ObjectId;
        activityType: ActivityType;
        actorType: ActivityActorType;
        ip: string;
        userAgent: string;
        documentId?: Types.ObjectId;
        documentName?: string;
      } = {
        workspaceId: new Types.ObjectId(params.workspaceId),
        activityType: params.activityType,
        actorType: params.actorType,
        ip: params.ip,
        userAgent: params.userAgent,
      };

      if (params.documentId) {
        payload.documentId = new Types.ObjectId(params.documentId);
      }
      if (params.documentName) {
        payload.documentName = params.documentName.slice(0, 1024);
      }

      await this.activityModel.create(payload);
    } catch (error) {
      this.logger.warn(
        `Failed to persist activity log (${params.activityType}): ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}

