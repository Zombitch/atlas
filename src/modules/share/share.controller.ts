import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Types } from 'mongoose';
import { ShareService } from './share.service';
import { AccessService } from '../access/access.service';
import { ScopeType } from './share-secret.schema';
import { DocumentService } from '../document/document.service';

@Controller('api/shares')
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly accessService: AccessService,
    private readonly documentService: DocumentService,
  ) {}

  @Post()
  async create(
    @Body('secret') secret: string,
    @Body('workspaceId') workspaceId: string,
    @Body('scopeType') scopeType: string,
    @Body('scopeId') scopeId: string,
    @Body('label') label: string,
    @Res() res: Response,
  ) {
    if (!secret || !workspaceId || !scopeType || !scopeId) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    if (scopeType !== ScopeType.WORKSPACE && scopeType !== ScopeType.DOCUMENT) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Type de scope invalide.' });
    }

    if (!Types.ObjectId.isValid(scopeId)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Identifiant de scope invalide.' });
    }

    if (scopeType === ScopeType.WORKSPACE && scopeId !== workspaceId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: "Le scope WORKSPACE doit cibler l'espace courant.",
      });
    }

    if (scopeType === ScopeType.DOCUMENT) {
      const doc = await this.documentService.findById(scopeId);
      if (!doc || doc.workspaceId.toString() !== workspaceId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Document introuvable pour cet espace.',
        });
      }
    }

    const { share, secret: shareSecret } = await this.shareService.createShare(
      workspaceId,
      scopeType as ScopeType,
      scopeId,
      label,
    );

    return res.status(HttpStatus.CREATED).json({
      shareId: share._id,
      secret: shareSecret,
      label: share.label || null,
      scopeType: share.scopeType,
      scopeId: share.scopeId,
      message: 'Secret de partage créé. Copiez-le maintenant.',
    });
  }

  @Get()
  async list(
    @Query('workspaceId') workspaceId: string,
    @Query('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!secret || !workspaceId) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const shares = await this.shareService.listByWorkspace(workspaceId);
    return res.status(HttpStatus.OK).json(shares);
  }

  @Post(':id/regenerate')
  async regenerate(
    @Param('id') id: string,
    @Body('secret') secret: string,
    @Body('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!secret || !workspaceId) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const result = await this.shareService.regenerate(id);
    if (!result) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: 'Partage introuvable.' });
    }

    return res.status(HttpStatus.OK).json({
      shareId: result.share._id,
      secret: result.secret,
      message: "Nouveau secret généré. L'ancien est invalidé.",
    });
  }

  @Delete(':id')
  async revoke(
    @Param('id') id: string,
    @Body('secret') secret: string,
    @Body('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    if (!secret || !workspaceId) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const revoked = await this.shareService.revoke(id);
    if (!revoked) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: 'Partage introuvable.' });
    }

    return res
      .status(HttpStatus.OK)
      .json({ message: 'Secret de partage révoqué.' });
  }
}
