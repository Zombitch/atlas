import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export enum ActivityType {
  WORKSPACE_ACCESS = 'WORKSPACE_ACCESS',
  FILE_VIEW = 'FILE_VIEW',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD',
}

export enum ActivityActorType {
  OWNER = 'owner',
  SHARE = 'share',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ActivityLog extends MongooseDocument {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(ActivityType), index: true })
  activityType: ActivityType;

  @Prop({ required: false, type: Types.ObjectId, index: true })
  documentId?: Types.ObjectId;

  @Prop({ required: false })
  documentName?: string;

  @Prop({ required: true, enum: Object.values(ActivityActorType) })
  actorType: ActivityActorType;

  @Prop({ required: true, trim: true, maxlength: 120 })
  ip: string;

  @Prop({ required: true, trim: true, maxlength: 1024 })
  userAgent: string;

  createdAt: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

