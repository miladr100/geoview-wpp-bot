/** DDI padrão do Brasil (sem o sinal de +) */
export const DEFAULT_DDI = '55';

/** Quantidade máxima de dígitos de um DDI */
export const DDI_MAX_LENGTH = 3;

/** Quantidade mínima de dígitos do número local (DDD + número) */
export const MIN_LOCAL_PHONE_DIGITS = 8;

/** Sufixo de ID do WhatsApp */
export const WHATSAPP_ID_SUFFIX = '@c.us';

/** Nome padrão quando o contato não informa nome */
export const DEFAULT_CONTACT_NAME = 'Desconhecido';

/** Status usado para contatos bloqueados */
export const BLOCKED_STATUS = 'bloqueado';

/** Quantidade de contatos por página na lista */
export const CONTACTS_PER_PAGE = 20;

/** Limite de resultados no popup de busca */
export const SEARCH_RESULTS_LIMIT = 50;

export type ContactSearchMode = 'name' | 'phone';
