import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkspaceDocument } from './document.schema';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { sanitizeFilename } from '../../common/utils/crypto.util';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectModel(WorkspaceDocument.name)
    private documentModel: Model<WorkspaceDocument>,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    workspaceId: string,
    file: Express.Multer.File,
  ): Promise<WorkspaceDocument> {
    const sanitizedName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedName);
    const storageName = `${uuidv4()}${ext}`;

    // Move file to upload directory
    const destPath = path.join(this.uploadDir, storageName);
    fs.writeFileSync(destPath, file.buffer);

    const doc = await this.documentModel.create({
      workspaceId: new Types.ObjectId(workspaceId),
      originalName: sanitizedName,
      storageName,
      mimeType: file.mimetype,
      size: file.size,
    });

    this.logger.log(
      `Document uploaded: ${doc._id} to workspace ${workspaceId}`,
    );
    return doc;
  }

  async findByWorkspace(workspaceId: string): Promise<WorkspaceDocument[]> {
    try {
      return await this.documentModel
        .find({ workspaceId: new Types.ObjectId(workspaceId) })
        .sort({ createdAt: -1 })
        .exec();
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<WorkspaceDocument | null> {
    try {
      return await this.documentModel.findById(id).exec();
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const doc = await this.documentModel.findById(id).exec();
      if (!doc) return false;

      // Delete file from disk
      const filePath = path.join(this.uploadDir, doc.storageName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await this.documentModel.findByIdAndDelete(id).exec();
      this.logger.log(`Document deleted: ${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async rename(id: string, newName: string): Promise<WorkspaceDocument | null> {
    try {
      const sanitizedName = sanitizeFilename(newName);
      const doc = await this.documentModel
        .findByIdAndUpdate(id, { originalName: sanitizedName }, { new: true })
        .exec();
      if (doc) {
        this.logger.log(`Document renamed: ${id} to ${sanitizedName}`);
      }
      return doc;
    } catch {
      return null;
    }
  }

  getFilePath(storageName: string): string {
    return path.join(this.uploadDir, storageName);
  }
}
