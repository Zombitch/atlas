import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ScopeType {
  WORKSPACE = 'WORKSPACE',
  DOCUMENT = 'DOCUMENT',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ShareSecret extends Document {
  @Prop({ required: true, index: true })
  secretHash: string;

  @Prop({ required: true, enum: ScopeType })
  scopeType: ScopeType;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  scopeId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  createdAt: Date;
}

export const ShareSecretSchema = SchemaFactory.createForClass(ShareSecret);

ShareSecretSchema.index({ scopeType: 1, scopeId: 1 });
ShareSecretSchema.index({ revokedAt: 1 });
