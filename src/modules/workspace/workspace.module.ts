import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workspace, WorkspaceSchema } from './workspace.schema';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import {
  WorkspaceDocument,
  WorkspaceDocumentSchema,
} from '../document/document.schema';
import { ShareSecret, ShareSecretSchema } from '../share/share-secret.schema';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: WorkspaceDocument.name, schema: WorkspaceDocumentSchema },
      { name: ShareSecret.name, schema: ShareSecretSchema },
    ]),
    AccessModule,
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService, MongooseModule],
})
export class WorkspaceModule {}
