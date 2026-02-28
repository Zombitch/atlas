import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceService } from './workspace.service';
import { AccessService } from '../access/access.service';

@Controller('api/workspaces')
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly accessService: AccessService,
  ) {}

  @Post()
  async create(@Body('name') name: string, @Res() res: Response) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: "Le nom de l'espace est requis.",
      });
    }

    const { workspace, ownerSecret } =
      await this.workspaceService.create(trimmedName);

    return res.status(HttpStatus.CREATED).json({
      workspaceId: workspace._id,
      ownerSecret,
      message:
        'Espace créé. Copiez votre secret propriétaire maintenant. Il ne pourra plus être affiché ensuite.',
    });
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Body('secret') secret: string,
    @Res() res: Response,
  ) {
    if (!secret) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const isOwner = await this.accessService.verifyOwnerForWorkspace(secret, id);
    if (!isOwner) {
      return res.status(HttpStatus.FORBIDDEN).json({ error: 'Accès refusé.' });
    }

    const deleted = await this.workspaceService.deleteWorkspace(id);
    if (!deleted) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: 'Espace introuvable.' });
    }

    return res
      .status(HttpStatus.OK)
      .json({ message: 'Espace supprimé avec succès.' });
  }
}
