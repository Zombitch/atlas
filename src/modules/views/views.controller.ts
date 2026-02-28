import { Controller, Get, Param, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DocumentService } from '../document/document.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AccessService } from '../access/access.service';
import { getFileCategory } from '../../common/utils/file-validation.util';
import * as fs from 'fs';

@Controller()
export class ViewsController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly workspaceService: WorkspaceService,
    private readonly accessService: AccessService,
  ) {}

  @Get()
  home(@Res() res: Response) {
    return res.render('home', { title: 'Atlas — Accueil' });
  }

  @Get('workspace/:id')
  async workspace(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!secret) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Secret requis pour accéder à cet espace.',
      });
    }

    const workspace = await this.workspaceService.findById(id);
    if (!workspace) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Accès refusé.',
      });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(secret, id);

    // If not owner, check if share secret gives workspace access
    if (!isOwner) {
      const context = await this.accessService.verifyAccess(secret);
      if (!context || context.workspaceId !== id) {
        return res.render('access-denied', {
          title: 'Accès refusé',
          message: 'Accès refusé.',
        });
      }
    }

    const documents = await this.documentService.findByWorkspace(id);
    const docsWithCategory = documents.map((doc) => ({
      ...doc.toObject(),
      category: getFileCategory(doc.mimeType),
    }));

    return res.render('workspace', {
      title: `Atlas — ${workspace.name}`,
      workspace,
      documents: docsWithCategory,
      isOwner,
      secret,
    });
  }

  @Get('doc/:id')
  async viewDocument(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!secret) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Secret requis.',
      });
    }

    const doc = await this.documentService.findById(id);
    if (!doc) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Accès refusé.',
      });
    }

    const hasAccess = await this.accessService.verifyAccessForDocument(
      secret,
      id,
      doc.workspaceId.toString(),
    );

    if (!hasAccess) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Accès refusé.',
      });
    }

    const category = getFileCategory(doc.mimeType);
    const filePath = this.documentService.getFilePath(doc.storageName);
    let textContent: string | null = null;
    let previousDocument: { id: string; name: string } | null = null;
    let nextDocument: { id: string; name: string } | null = null;

    if (category === 'text' && fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      textContent = buffer.toString('utf-8').slice(0, 500000);
    }

    const workspaceId = doc.workspaceId.toString();
    const isOwner = await this.accessService.verifyOwnerForWorkspace(secret, workspaceId);
    const documentsInScope = isOwner
      ? await this.documentService.findByWorkspace(workspaceId)
      : [];

    if (!isOwner) {
      const context = await this.accessService.verifyAccess(secret);
      const hasWorkspaceShareAccess =
        context &&
        context.type === 'share' &&
        context.workspaceId === workspaceId &&
        context.scopeType === 'WORKSPACE' &&
        context.scopeId === workspaceId;

      if (hasWorkspaceShareAccess) {
        documentsInScope.push(...(await this.documentService.findByWorkspace(workspaceId)));
      } else {
        documentsInScope.push(doc);
      }
    }

    const currentIndex = documentsInScope.findIndex(
      (currentDoc) => currentDoc._id.toString() === id,
    );

    if (currentIndex > 0) {
      const previous = documentsInScope[currentIndex - 1];
      previousDocument = {
        id: previous._id.toString(),
        name: previous.originalName,
      };
    }

    if (currentIndex >= 0 && currentIndex < documentsInScope.length - 1) {
      const next = documentsInScope[currentIndex + 1];
      nextDocument = {
        id: next._id.toString(),
        name: next.originalName,
      };
    }

    return res.render('document-view', {
      title: `Atlas — ${doc.originalName}`,
      document: doc.toObject(),
      category,
      textContent,
      secret,
      previousDocument,
      nextDocument,
    });
  }

  @Get('shares')
  async shares(
    @Query('workspaceId') workspaceId: string,
    @Query('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!secret || !workspaceId) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Secret propriétaire requis.',
      });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(secret, workspaceId);
    if (!isOwner) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Accès refusé. Secret propriétaire requis.',
      });
    }

    const workspace = await this.workspaceService.findById(workspaceId);

    return res.render('shares', {
      title: 'Atlas — Gestion des partages',
      workspaceId,
      workspace,
      secret,
    });
  }
}
