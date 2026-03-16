import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CardHoldersService } from '../services/card-holders.service';
import { CardDocumentsService } from '../services/card-documents.service';
import { CreatePersonalHolderDto } from '../dto/create-personal-holder.dto';
import { CreateBusinessHolderDto } from '../dto/create-business-holder.dto';
import { UploadDocumentsDto } from '../dto/upload-documents.dto';
import {
  ApiCardHoldersTag,
  ApiCreatePersonalHolder,
  ApiCreateBusinessHolder,
  ApiGetHolderStatus,
  ApiUploadDocuments,
} from '../docs/card-holders.controller.docs';

@ApiCardHoldersTag()
@Controller('cardholders')
@UseGuards(JwtAuthGuard)
export class CardHoldersController {
  constructor(
    private readonly holdersService: CardHoldersService,
    private readonly documentsService: CardDocumentsService,
  ) {}

  @ApiCreatePersonalHolder()
  @Post('personal')
  createPersonal(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePersonalHolderDto,
    @Req() req: Request,
  ) {
    return this.holdersService.createPersonal(userId, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @ApiCreateBusinessHolder()
  @Post('business')
  createBusiness(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBusinessHolderDto,
    @Req() req: Request,
  ) {
    return this.holdersService.createBusiness(userId, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @ApiGetHolderStatus()
  @Get(':holderId/status')
  getStatus(
    @CurrentUser('sub') userId: string,
    @Param('holderId', ParseUUIDPipe) holderId: string,
    @Query('refresh', new ParseBoolPipe({ optional: true })) refresh = false,
  ) {
    return this.holdersService.getStatus(userId, holderId, refresh);
  }

  @ApiUploadDocuments()
  @Post('documents')
  uploadDocuments(
    @CurrentUser('sub') userId: string,
    @Body() dto: UploadDocumentsDto,
  ) {
    return this.documentsService.upload(userId, dto);
  }
}
