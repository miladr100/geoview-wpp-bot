export interface ClientContact {
    _id: any;
    whatsappName: string | null;
    phone: string;
    status: string;
    tag?: string | null;
    service?: string | null;
    form?: {
        nome_solicitante?: string;
        empresa?: string;
        email?: string;
        telefone_contato?: string;
        local_servico?: string;
        tamanho_area_pesquisa?: string;
        previsao_realizacao_servico?: string;
        observacoes?: string;
    } | null;
    boardId?: string | null;
    groupId?: string | null;
    block: boolean;
    hasMedia: boolean;
    lastMessage?: string | null;
    lastMessageId: string;
    mediaUrl?: string | null;
    running: boolean;
    audioMessage?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Message {
  number: string;
  message: string;
}
export interface SessionInfo {
  pushName?: string;
  id?: string;
}