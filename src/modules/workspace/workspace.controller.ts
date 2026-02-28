import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { WorkspaceService } from './workspace.service';

@Controller('api/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

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
}
