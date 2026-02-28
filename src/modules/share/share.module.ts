import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShareSecret, ShareSecretSchema } from './share-secret.schema';
import { ShareService } from './share.service';
import { ShareController } from './share.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShareSecret.name, schema: ShareSecretSchema },
    ]),
    AccessModule,
  ],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
