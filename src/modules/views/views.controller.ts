import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DocumentService } from '../document/document.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AccessService } from '../access/access.service';
import { getFileCategory } from '../../common/utils/file-validation.util';
import * as fs from 'fs';
import { ActivityActorType, ActivityType } from '../activity/activity.schema';
import { ActivityService } from '../activity/activity.service';

@Controller()
export class ViewsController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly workspaceService: WorkspaceService,
    private readonly accessService: AccessService,
    private readonly activityService: ActivityService,
  ) {}

  @Get()
  home(@Res() res: Response) {
    return res.render('home', { title: 'Atlas — Accueil' });
  }

  @Get('workspace/:id')
  async workspace(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Query('path') currentPathQuery: string,
    @Req() req: Request,
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

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      id,
    );

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

    const actorType = isOwner ? ActivityActorType.OWNER : ActivityActorType.SHARE;
    await this.activityService.logWorkspaceAccess(
      id,
      actorType,
      this.activityService.resolveRequestMeta(req),
    );

    const documents = await this.documentService.findByWorkspace(id);
    const docsWithCategory = documents.map((doc) => {
      const originalName = this.normalizePath(doc.originalName);
      return {
        ...doc.toObject(),
        originalName,
        category: getFileCategory(doc.mimeType),
      };
    });
    const currentPath = this.normalizePath(currentPathQuery);
    const currentSegments = this.pathSegments(currentPath);
    const folderMap = new Map<string, { name: string; path: string }>();
    const filesInCurrentFolder: Array<Record<string, unknown>> = [];

    for (const doc of docsWithCategory) {
      const originalName = String(doc.originalName);
      const allSegments = this.pathSegments(originalName);
      if (!allSegments.length) {
        continue;
      }

      const filename = allSegments[allSegments.length - 1];
      const folderSegments = allSegments.slice(0, -1);
      const prefixMatches = currentSegments.every(
        (segment, index) => folderSegments[index] === segment,
      );

      if (!prefixMatches) {
        continue;
      }

      if (folderSegments.length === currentSegments.length) {
        filesInCurrentFolder.push({
          ...doc,
          displayName: filename,
        });
        continue;
      }

      const childName = folderSegments[currentSegments.length];
      const childPath = [...currentSegments, childName].join('/');
      if (!folderMap.has(childPath)) {
        folderMap.set(childPath, { name: childName, path: childPath });
      }
    }

    const folders = Array.from(folderMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'fr'),
    );
    filesInCurrentFolder.sort((a, b) =>
      String(a.displayName).localeCompare(String(b.displayName), 'fr'),
    );
    const breadcrumbs = this.buildBreadcrumbs(currentPath);

    return res.render('workspace', {
      title: `Atlas — ${workspace.name}`,
      workspace,
      documents: filesInCurrentFolder,
      totalDocuments: docsWithCategory.length,
      folders,
      breadcrumbs,
      currentPath,
      isOwner,
      secret,
    });
  }

  @Get('doc/:id')
  async viewDocument(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Req() req: Request,
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
    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
    const actorType = isOwner ? ActivityActorType.OWNER : ActivityActorType.SHARE;

    await this.activityService.logFileView(
      workspaceId,
      doc._id.toString(),
      doc.originalName,
      actorType,
      this.activityService.resolveRequestMeta(req),
    );

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
        documentsInScope.push(
          ...(await this.documentService.findByWorkspace(workspaceId)),
        );
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

    const isOwner = await this.accessService.verifyOwnerForWorkspace(
      secret,
      workspaceId,
    );
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

  @Get('workspace/:id/activity')
  async workspaceActivity(
    @Param('id') id: string,
    @Query('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!secret) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Secret propriétaire requis.',
      });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(secret, id);
    if (!isOwner) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Accès refusé. Secret propriétaire requis.',
      });
    }

    const workspace = await this.workspaceService.findById(id);
    if (!workspace) {
      return res.render('access-denied', {
        title: 'Accès refusé',
        message: 'Espace introuvable.',
      });
    }

    const logs = await this.activityService.listByWorkspace(id, 1000);
    const formattedLogs = logs.map((log) => {
      const label =
        log.activityType === ActivityType.WORKSPACE_ACCESS
          ? "Accès à l'espace"
          : log.activityType === ActivityType.FILE_VIEW
            ? 'Fichier consulté'
            : 'Fichier téléchargé';

      return {
        id: log._id.toString(),
        activityType: log.activityType,
        activityLabel: label,
        actorType: log.actorType,
        actorLabel: log.actorType === ActivityActorType.OWNER ? 'Propriétaire' : 'Partage',
        documentName: log.documentName || '-',
        documentId: log.documentId ? log.documentId.toString() : '-',
        ip: log.ip,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      };
    });

    return res.render('workspace-activity', {
      title: `Atlas — Activité ${workspace.name}`,
      workspace,
      secret,
      logs: formattedLogs,
    });
  }

  private normalizePath(value: string | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .replace(/\\/g, '/')
      .split('/')
      .filter((segment) => segment && segment !== '.' && segment !== '..')
      .join('/')
      .slice(0, 1024);
  }

  private pathSegments(pathValue: string): string[] {
    return pathValue.split('/').filter(Boolean);
  }

  private buildBreadcrumbs(pathValue: string): Array<{ name: string; path: string }> {
    const segments = this.pathSegments(pathValue);
    const breadcrumbs: Array<{ name: string; path: string }> = [];

    for (let i = 0; i < segments.length; i += 1) {
      breadcrumbs.push({
        name: segments[i],
        path: segments.slice(0, i + 1).join('/'),
      });
    }

    return breadcrumbs;
  }
}
