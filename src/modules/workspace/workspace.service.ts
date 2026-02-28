import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workspace } from './workspace.schema';
import { generateSecret, hashSecret } from '../../common/utils/crypto.util';
import {
  WorkspaceDocument,
} from '../document/document.schema';
import { ShareSecret } from '../share/share-secret.schema';
import { ActivityLog } from '../activity/activity.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    @InjectModel(WorkspaceDocument.name)
    private documentModel: Model<WorkspaceDocument>,
    @InjectModel(ShareSecret.name) private shareModel: Model<ShareSecret>,
    @InjectModel(ActivityLog.name) private activityModel: Model<ActivityLog>,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  async create(
    name: string,
  ): Promise<{ workspace: Workspace; ownerSecret: string }> {
    const ownerSecret = generateSecret();
    const ownerSecretHash = await hashSecret(ownerSecret);

    const workspace = await this.workspaceModel.create({
      name: name || 'Espace sans nom',
      ownerSecretHash,
    });

    this.logger.log(`Workspace created: ${workspace._id}`);

    return { workspace, ownerSecret };
  }

  async findById(id: string): Promise<Workspace | null> {
    try {
      return await this.workspaceModel.findById(id).exec();
    } catch {
      return null;
    }
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    try {
      const workspaceObjectId = new Types.ObjectId(id);
      const documents = await this.documentModel
        .find({ workspaceId: workspaceObjectId })
        .exec();

      for (const doc of documents) {
        const filePath = path.join(this.uploadDir, doc.storageName);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to delete file "${doc.storageName}" for workspace ${id}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }
      }

      const [documentsResult, sharesResult, activityResult, workspaceResult] =
        await Promise.all([
          this.documentModel.deleteMany({ workspaceId: workspaceObjectId }).exec(),
          this.shareModel.deleteMany({ workspaceId: workspaceObjectId }).exec(),
          this.activityModel.deleteMany({ workspaceId: workspaceObjectId }).exec(),
          this.workspaceModel.findByIdAndDelete(id).exec(),
        ]);

      if (!workspaceResult) {
        return false;
      }

      this.logger.log(
        `Workspace deleted: ${id} (${documentsResult.deletedCount || 0} docs, ${sharesResult.deletedCount || 0} shares, ${activityResult.deletedCount || 0} activity logs)`,
      );
      return true;
    } catch {
      return false;
    }
  }
}
