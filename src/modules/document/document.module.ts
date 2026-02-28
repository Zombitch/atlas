import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { WorkspaceDocument, WorkspaceDocumentSchema } from './document.schema';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkspaceDocument.name, schema: WorkspaceDocumentSchema },
    ]),
    MulterModule.register({
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
      },
    }),
    AccessModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
