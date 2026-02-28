import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Workspace extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  ownerSecretHash: string;

  createdAt: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
