import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AccessService } from './access.service';

@Controller('api/access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post()
  async verify(@Body('secret') secret: string, @Res() res: Response) {
    if (!secret) {
      return res.status(HttpStatus.FORBIDDEN).json({
        error: 'Accès refusé.',
      });
    }

    const context = await this.accessService.verifyAccess(secret);

    if (!context) {
      return res.status(HttpStatus.FORBIDDEN).json({
        error: 'Accès refusé.',
      });
    }

    return res.status(HttpStatus.OK).json(context);
  }
}
