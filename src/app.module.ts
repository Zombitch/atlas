import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { DocumentModule } from './modules/document/document.module';
import { ShareModule } from './modules/share/share.module';
import { AccessModule } from './modules/access/access.module';
import { ViewsModule } from './modules/views/views.module';

const env = process.env.NODE_ENV || 'development';
const collectionPrefix = env === 'production' ? 'atlas_prod' : 'atlas_dev';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/atlas_dev',
      {
        connectionFactory: (connection) => {
          return connection;
        },
      },
    ),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
        limit: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
      },
    ]),
    WorkspaceModule,
    DocumentModule,
    ShareModule,
    AccessModule,
    ViewsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
