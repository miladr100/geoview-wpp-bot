import mongoose, { Schema, Document } from 'mongoose';

export interface IClientContact extends Document {
  whatsappName: string;
  phone: string;
  status: string;
  tag?: string | null;
  service?: string | null;
  form?: {
    nome?: string;
    empresa?: string;
    email?: string;
    contato?: string;
    local?: string;
    area?: string;
    previsao?: string | null;
    observacoes?: string | null;
  } | null;
  boardId?: string | null;
  groupId?: string | null;
  block?: boolean;
  hasMedia: boolean;
  lastMessage?: string | null;
  lastMessageId: string;
  mediaUrl?: string | null;
  running: boolean;
  audioMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClientContactSchema = new Schema<IClientContact>(
  {
    whatsappName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    tag: { type: String, default: null },
    service: { type: String, default: null },
    boardId: { type: String, default: null },
    groupId: { type: String, default: null },
    block: { type: Boolean, default: false },
    hasMedia: { type: Boolean, default: null },
    lastMessage: { type: String, default: null },
    lastMessageId: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    running: { type: Boolean, required: true },
    audioMessage: { type: String, default: null },
    form: {
      type: {
        nome: { type: String },
        empresa: { type: String },
        email: { type: String },
        contato: { type: String },
        local: { type: String },
        area: { type: String },
        previsao: { type: String, default: null },
        observacoes: { type: String, default: null },
      },
      default: null
    },
  },
  { timestamps: true }
);

const MODEL_NAME = 'ClientContact';

// Garante que o model em cache incorpore campos novos (ex.: tag)
if (mongoose.models[MODEL_NAME]) {
  const cachedModel = mongoose.models[MODEL_NAME];
  if (!cachedModel.schema.path('tag')) {
    cachedModel.schema.add({ tag: { type: String, default: null } });
  }
}

export const ClientContactModel =
  (mongoose.models[MODEL_NAME] as mongoose.Model<IClientContact>) ||
  mongoose.model<IClientContact>(MODEL_NAME, ClientContactSchema);
