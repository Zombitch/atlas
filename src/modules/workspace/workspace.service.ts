import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace } from './workspace.schema';
import { generateSecret, hashSecret } from '../../common/utils/crypto.util';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
  ) {}

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
}
