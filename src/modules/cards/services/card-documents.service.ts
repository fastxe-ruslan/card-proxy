import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardholderEntity } from '../entities/cardholder.entity';
import {
  DocumentUploadResult,
  UploadDocumentsDto,
} from '../dto/upload-documents.dto';
import { ApiResponse, ok } from '../dto/api-response';
import { WasabiApiService } from '../../wasabi-client/services/wasabi-api.service';
import { AuditService } from '../../audit/audit.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  {
    mime: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

function detectMimeType(buf: Buffer): string | null {
  for (const { mime, bytes } of MAGIC_BYTES) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  return null;
}

function validateDocument(field: string, base64: string): Buffer {
  let buf: Buffer;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    throw new BadRequestException(`${field}: invalid base64 encoding`);
  }
  if (buf.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException(`${field}: file size exceeds 5 MB limit`);
  }
  const mime = detectMimeType(buf);
  if (!mime) {
    throw new BadRequestException(
      `${field}: unsupported file format (JPEG, PNG, PDF only)`,
    );
  }
  return buf;
}

@Injectable()
export class CardDocumentsService {
  private readonly logger = new Logger(CardDocumentsService.name);

  constructor(
    @InjectRepository(CardholderEntity)
    private readonly holderRepo: Repository<CardholderEntity>,
    private readonly wasabiApi: WasabiApiService,
    private readonly auditService: AuditService,
  ) {}

  async upload(
    userId: string,
    dto: UploadDocumentsDto,
  ): Promise<ApiResponse<DocumentUploadResult[]>> {
    const holder = await this.holderRepo.findOne({
      where: { id: dto.holderId, userId },
    });
    if (!holder)
      throw new NotFoundException('Cardholder not found or access denied');

    if (
      !dto.frontDocument &&
      !dto.backDocument &&
      !dto.selfie &&
      !dto.signature
    ) {
      throw new BadRequestException('At least one document must be provided');
    }

    const uploads: Array<{
      field: DocumentUploadResult['field'];
      base64: string;
      docType: string;
    }> = [];
    if (dto.frontDocument)
      uploads.push({
        field: 'frontDocument',
        base64: dto.frontDocument,
        docType: 'ID_FRONT',
      });
    if (dto.backDocument)
      uploads.push({
        field: 'backDocument',
        base64: dto.backDocument,
        docType: 'ID_BACK',
      });
    if (dto.selfie)
      uploads.push({ field: 'selfie', base64: dto.selfie, docType: 'SELFIE' });
    if (dto.signature)
      uploads.push({
        field: 'signature',
        base64: dto.signature,
        docType: 'SIGNATURE',
      });

    const validated = uploads.map(({ field, base64, docType }) => ({
      field,
      buffer: validateDocument(field, base64),
      mimeType:
        detectMimeType(Buffer.from(base64, 'base64')) ??
        'application/octet-stream',
      docType,
    }));

    const results: DocumentUploadResult[] = [];

    for (const { field, buffer, mimeType, docType } of validated) {
      try {
        const res = await this.wasabiApi.uploadDocument(
          {
            holderId: holder.wasabiHolderId ?? dto.holderId,
            documentType: docType,
            file: buffer,
            fileName: `${docType.toLowerCase()}.${mimeType.split('/')[1]}`,
            mimeType,
          },
          { programId: holder.programId },
        );
        results.push({ field, fileId: res.fileId, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        this.logger.warn(`Document upload failed for ${field}: ${msg}`);
        results.push({ field, success: false, error: msg });
      }
    }

    this.auditService.log({
      actorId: userId,
      actorType: 'user',
      action: 'documents.upload',
      entityType: 'cardholder',
      entityId: holder.id,
      metadata: { types: validated.map((v) => v.field) },
    });

    return ok(results);
  }
}
