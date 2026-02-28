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
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { DocumentService } from './document.service';
import { AccessService } from '../access/access.service';
import { validateMimeAndExtension } from '../../common/utils/file-validation.util';
import { ActivityActorType } from '../activity/activity.schema';
import { ActivityService } from '../activity/activity.service';

@Controller('api')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly accessService: AccessService,
    private readonly activityService: ActivityService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', undefined, {
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
        files: parseInt(process.env.MAX_FILE_COUNT || '200', 10),
      },
    }),
  )
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('workspaceId') workspaceId: string,
    @Body('secret') secret: string,
    @Body('relativePaths') relativePathsRaw: string | string[] | undefined,
    @Res() res: Response,
  ) {
    if (!files || files.length === 0) {
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

    for (const file of files) {
      if (!validateMimeAndExtension(file.mimetype, file.originalname)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: `Type de fichier non autorisé: ${file.originalname}`,
        });
      }
    }

    const relativePaths = this.normalizeRelativePaths(relativePathsRaw);
    const docs = await this.documentService.uploadMany(
      workspaceId,
      files,
      relativePaths,
    );

    return res.status(HttpStatus.CREATED).json({
      count: docs.length,
    });
  }

  private normalizeRelativePaths(
    rawValue: string | string[] | undefined,
  ): string[] {
    if (!rawValue) {
      return [];
    }

    return Array.isArray(rawValue) ? rawValue : [rawValue];
  }

  @Get('documents/:workspaceId')
  async listByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Query('secret') secretQuery: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const secret = this.extractSecret(req, secretQuery);
    if (!secret) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const hasWorkspaceAccess = await this.hasWorkspaceAccess(secret, workspaceId);
    if (!hasWorkspaceAccess) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

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
    const secret = this.extractSecret(req, secretQuery);

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

    const disposition = this.shouldServeInline(doc.mimeType)
      ? 'inline'
      : 'attachment';
    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      doc.workspaceId.toString(),
    );
    const actorType = isOwner ? ActivityActorType.OWNER : ActivityActorType.SHARE;
    const meta = this.activityService.resolveRequestMeta(req);
    let shareLabel: string | undefined;

    if (!isOwner) {
      const context = await this.accessService.verifyAccess(secret);
      if (
        context &&
        context.type === 'share' &&
        context.workspaceId === doc.workspaceId.toString()
      ) {
        shareLabel = context.shareLabel;
      }
    }

    await this.activityService.logFileDownload(
      doc.workspaceId.toString(),
      doc._id.toString(),
      doc.originalName,
      actorType,
      meta,
      shareLabel,
    );

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

  private shouldServeInline(mimeType: string): boolean {
    const normalized = (mimeType || '').toLowerCase();
    const safeInlineMimeTypes = new Set([
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
    ]);

    return safeInlineMimeTypes.has(normalized);
  }

  private extractSecret(req: Request, secretQuery?: string): string | undefined {
    const authHeader = req.get('authorization');
    const bearerSecret =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    return secretQuery || req.get('x-atlas-secret') || bearerSecret || undefined;
  }

  private async hasWorkspaceAccess(
    secret: string,
    workspaceId: string,
  ): Promise<boolean> {
    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    if (isOwner) {
      return true;
    }

    const context = await this.accessService.verifyAccess(secret);
    if (!context || context.workspaceId !== workspaceId) {
      return false;
    }

    if (context.type !== 'share') {
      return false;
    }

    return context.scopeType === 'WORKSPACE' && context.scopeId === workspaceId;
  }
}
