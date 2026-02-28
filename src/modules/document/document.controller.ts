import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { DocumentService } from './document.service';
import { AccessService } from '../access/access.service';
import { getFileCategory } from '../../common/utils/file-validation.util';

@Controller('api')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly accessService: AccessService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('workspaceId') workspaceId: string,
    @Body('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!file) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Aucun fichier fourni.' });
    }

    if (!workspaceId || !secret) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const doc = await this.documentService.upload(workspaceId, file);
    return res.status(HttpStatus.CREATED).json({
      id: doc._id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
    });
  }

  @Get('documents/:workspaceId')
  async listByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const documents = await this.documentService.findByWorkspace(workspaceId);
    return res.status(HttpStatus.OK).json(documents);
  }

  @Delete('documents/:id')
  async delete(
    @Param('id') id: string,
    @Body('secret') secret: string,
    @Res() res: Response,
  ) {
    const doc = await this.documentService.findById(id);
    if (!doc) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      doc.workspaceId.toString(),
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    await this.documentService.delete(id);
    return res.status(HttpStatus.OK).json({ message: 'Document supprimé.' });
  }

  @Patch('documents/:id/rename')
  async rename(
    @Param('id') id: string,
    @Body('secret') secret: string,
    @Body('newName') newName: string,
    @Res() res: Response,
  ) {
    if (!newName || !newName.trim()) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Nom invalide.' });
    }

    const doc = await this.documentService.findById(id);
    if (!doc) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      doc.workspaceId.toString(),
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const updated = await this.documentService.rename(id, newName.trim());
    return res.status(HttpStatus.OK).json(updated);
  }

  @Post('download/verify')
  async verifyDownload(
    @Body('documentId') documentId: string,
    @Body('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!documentId || !secret) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const doc = await this.documentService.findById(documentId);
    if (!doc) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const hasAccess = await this.accessService.verifyAccessForDocument(
      secret,
      documentId,
      doc.workspaceId.toString(),
    );
    if (!hasAccess) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    return res.status(HttpStatus.OK).json({
      authorized: true,
      documentId: doc._id,
      filename: doc.originalName,
    });
  }

  @Get('download/:id')
  async download(
    @Param('id') id: string,
    @Query('secret') secretQuery: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const authHeader = req.get('authorization');
    const bearerSecret =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : undefined;
    const secret = secretQuery || req.get('x-atlas-secret') || bearerSecret;

    if (!secret) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }
    const doc = await this.documentService.findById(id);
    if (!doc) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const hasAccess = await this.accessService.verifyAccessForDocument(
      secret,
      id,
      doc.workspaceId.toString(),
    );
    if (!hasAccess) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const filePath = this.documentService.getFilePath(doc.storageName);
    if (!fs.existsSync(filePath)) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: 'Fichier introuvable.' });
    }

    const category = getFileCategory(doc.mimeType);
    const disposition = category === 'binary' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(doc.originalName)}"`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', doc.size);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
