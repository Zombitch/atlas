import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace } from '../workspace/workspace.schema';
import { ShareSecret } from '../share/share-secret.schema';
import { verifySecret } from '../../common/utils/crypto.util';

export interface AccessContext {
  type: 'owner' | 'share';
  workspaceId: string;
  scopeType?: 'WORKSPACE' | 'DOCUMENT';
  scopeId?: string;
}

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    @InjectModel(ShareSecret.name) private shareSecretModel: Model<ShareSecret>,
  ) {}

  async verifyAccess(secret: string): Promise<AccessContext | null> {
    if (!secret || typeof secret !== 'string' || secret.length < 10) {
      this.logger.warn('Invalid secret format attempted');
      return null;
    }

    // Check owner secrets first
    const workspaces = await this.workspaceModel.find().exec();
    for (const ws of workspaces) {
      const isValid = await verifySecret(secret, ws.ownerSecretHash);
      if (isValid) {
        this.logger.log(`Owner access granted for workspace ${ws._id}`);
        return {
          type: 'owner',
          workspaceId: ws._id.toString(),
        };
      }
    }

    // Check share secrets
    const shares = await this.shareSecretModel.find({ revokedAt: null }).exec();
    for (const share of shares) {
      const isValid = await verifySecret(secret, share.secretHash);
      if (isValid) {
        this.logger.log(`Share access granted for ${share.scopeType} ${share.scopeId}`);
        return {
          type: 'share',
          workspaceId: share.workspaceId.toString(),
          scopeType: share.scopeType,
          scopeId: share.scopeId.toString(),
        };
      }
    }

    this.logger.warn('Invalid secret attempt');
    return null;
  }

  async verifyOwnerForWorkspace(secret: string, workspaceId: string): Promise<boolean> {
    try {
      const workspace = await this.workspaceModel.findById(workspaceId).exec();
      if (!workspace) return false;
      return await verifySecret(secret, workspace.ownerSecretHash);
    } catch {
      return false;
    }
  }

  async verifyAccessForDocument(secret: string, documentId: string, workspaceId: string): Promise<boolean> {
    // Check owner access
    const isOwner = await this.verifyOwnerForWorkspace(secret, workspaceId);
    if (isOwner) return true;

    // Check share secrets
    const shares = await this.shareSecretModel.find({
      revokedAt: null,
      $or: [
        { scopeType: 'WORKSPACE', scopeId: workspaceId },
        { scopeType: 'DOCUMENT', scopeId: documentId },
      ],
    }).exec();

    for (const share of shares) {
      const isValid = await verifySecret(secret, share.secretHash);
      if (isValid) return true;
    }

    return false;
  }
}
