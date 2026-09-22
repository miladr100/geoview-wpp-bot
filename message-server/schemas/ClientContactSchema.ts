import { z } from "zod";

// Schema para o formulário de contato
export const FormSchema = z.object({
  nome: z.string().optional(),
  empresa: z.string().optional(),
  email: z.string().email().optional(),
  contato: z.string().optional(),
  local: z.string().optional(),
  area: z.string().optional(),
  previsao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

// Schema completo para ClientContact
export const ClientContactSchema = z.object({
  _id: z.any(),
  whatsappName: z.string().nullable().optional(),
  phone: z.string(),
  status: z.string(),
  tag: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  form: FormSchema.nullable().optional(),
  boardId: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  block: z.boolean().default(false),
  hasMedia: z.boolean(),
  lastMessage: z.string().nullable().optional(),
  lastMessageId: z.string(),
  mediaUrl: z.string().nullable().optional(),
  running: z.boolean(),
  audioMessage: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema para criação (sem campos automáticos)
export const CreateClientContactSchema = ClientContactSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema para atualização (todos os campos opcionais exceto phone)
export const UpdateClientContactSchema = ClientContactSchema.partial().extend({
  phone: z.string(), // phone sempre obrigatório para identificar o contato
});

// Types exportados
export type ClientContact = z.infer<typeof ClientContactSchema>;
export type CreateClientContact = z.infer<typeof CreateClientContactSchema>;
export type UpdateClientContact = z.infer<typeof UpdateClientContactSchema>;
export type FormType = z.infer<typeof FormSchema>;

// Aliases para compatibilidade
export type ConversionSchema = ClientContact;
export type IClientContact = ClientContact;