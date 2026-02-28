import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShareSecret, ScopeType } from './share-secret.schema';
import { generateSecret, hashSecret } from '../../common/utils/crypto.util';

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(
    @InjectModel(ShareSecret.name) private shareModel: Model<ShareSecret>,
  ) {}

  async createShare(
    workspaceId: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<{ share: ShareSecret; secret: string }> {
    const secret = generateSecret();
    const secretHash = await hashSecret(secret);

    const share = await this.shareModel.create({
      secretHash,
      scopeType,
      scopeId: new Types.ObjectId(scopeId),
      workspaceId: new Types.ObjectId(workspaceId),
      revokedAt: null,
    });

    this.logger.log(`Share created: ${share._id} for ${scopeType} ${scopeId}`);
    return { share, secret };
  }

  async listByWorkspace(workspaceId: string): Promise<ShareSecret[]> {
    try {
      return await this.shareModel
        .find({ workspaceId: new Types.ObjectId(workspaceId) })
        .sort({ createdAt: -1 })
        .exec();
    } catch {
      return [];
    }
  }

  async revoke(shareId: string): Promise<boolean> {
    try {
      const result = await this.shareModel
        .findByIdAndUpdate(shareId, { revokedAt: new Date() })
        .exec();
      if (result) {
        this.logger.log(`Share revoked: ${shareId}`);
      }
      return !!result;
    } catch {
      return false;
    }
  }

  async regenerate(
    shareId: string,
  ): Promise<{ share: ShareSecret; secret: string } | null> {
    try {
      const oldShare = await this.shareModel.findById(shareId).exec();
      if (!oldShare) return null;

      // Revoke old share
      await this.shareModel
        .findByIdAndUpdate(shareId, { revokedAt: new Date() })
        .exec();

      // Create new share with same scope
      const secret = generateSecret();
      const secretHash = await hashSecret(secret);

      const newShare = await this.shareModel.create({
        secretHash,
        scopeType: oldShare.scopeType,
        scopeId: oldShare.scopeId,
        workspaceId: oldShare.workspaceId,
        revokedAt: null,
      });

      this.logger.log(`Share regenerated: ${shareId} -> ${newShare._id}`);
      return { share: newShare, secret };
    } catch {
      return null;
    }
  }

  async deleteShare(shareId: string): Promise<boolean> {
    try {
      const result = await this.shareModel.findByIdAndDelete(shareId).exec();
      if (result) {
        this.logger.log(`Share deleted: ${shareId}`);
      }
      return !!result;
    } catch {
      return false;
    }
  }
}
