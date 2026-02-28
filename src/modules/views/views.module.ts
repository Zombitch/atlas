import { Module } from '@nestjs/common';
import { ViewsController } from './views.controller';
import { DocumentModule } from '../document/document.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AccessModule } from '../access/access.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [DocumentModule, WorkspaceModule, AccessModule, ActivityModule],
  controllers: [ViewsController],
})
export class ViewsModule {}
