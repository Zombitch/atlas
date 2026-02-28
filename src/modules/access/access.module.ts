import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessService } from './access.service';
import { AccessController } from './access.controller';
import { Workspace, WorkspaceSchema } from '../workspace/workspace.schema';
import { ShareSecret, ShareSecretSchema } from '../share/share-secret.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: ShareSecret.name, schema: ShareSecretSchema },
    ]),
  ],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
