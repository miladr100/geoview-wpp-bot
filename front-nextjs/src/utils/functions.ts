import { getWhatsappApiBaseUrl, getMessageApiBaseUrl, getApiKey } from './config';
import {
  DEFAULT_CONTACT_NAME,
  DEFAULT_DDI,
  DDI_MAX_LENGTH,
  MIN_LOCAL_PHONE_DIGITS,
  MAX_LOCAL_PHONE_DIGITS,
  WHATSAPP_ID_SUFFIX,
  BLOCKED_STATUS,
  ContactSearchMode,
} from './consts';
import { ClientContact, SessionInfo } from './types';

export const api = (path: string) => {
  // Remove o prefixo /api se existir
  const cleanPath = path.startsWith('/api') ? path : `/api/${path}`;
  return `${getWhatsappApiBaseUrl()}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
};

export const messageApi = (path: string) =>
  `${getMessageApiBaseUrl()}/api${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Função para fazer requisições para a API de mensagens com autenticação automática
 * @param path - Caminho da API (ex: '/contacts', '/ping')
 * @param options - Opções do fetch (método, body, etc.)
 * @returns Promise com a resposta da requisição
 */
export const messageApiRequest = async (path: string, options: RequestInit = {}) => {
  const url = messageApi(path);
  const apiKey = getApiKey();

  // Merge dos headers, incluindo a API key automaticamente
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

/** Remove tudo que não for dígito */
export const sanitizeDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Normaliza o DDI: apenas dígitos, até o limite máximo.
 * O sinal de + fica fora do valor (é só visual no input).
 */
export const sanitizeDdi = (value: string) =>
  sanitizeDigits(value).slice(0, DDI_MAX_LENGTH);

/** Valida o número local (sem DDI) */
export const validateLocalPhoneNumber = (phone: string) => {
  const cleaned = sanitizeDigits(phone);
  return (
    cleaned.length >= MIN_LOCAL_PHONE_DIGITS &&
    cleaned.length <= MAX_LOCAL_PHONE_DIGITS
  );
};

/**
 * Máscara do número local:
 * - só dígitos
 * - se colarem/digitarem o DDI junto (ex: 5531995666706), remove o prefixo do DDI
 * - limita ao tamanho máximo do número local
 */
export const maskLocalPhoneNumber = (value: string, ddi: string) => {
  let digits = sanitizeDigits(value);
  const ddiDigits = sanitizeDigits(ddi);

  // Só remove o DDI quando o valor claramente inclui país + número local
  // (evita cortar DDDs brasileiros que começam com "55", ex.: Santa Maria)
  if (
    ddiDigits &&
    digits.startsWith(ddiDigits) &&
    digits.length > MAX_LOCAL_PHONE_DIGITS &&
    digits.length - ddiDigits.length >= MIN_LOCAL_PHONE_DIGITS
  ) {
    digits = digits.slice(ddiDigits.length);
  }

  return digits.slice(0, MAX_LOCAL_PHONE_DIGITS);
};

/** Monta o número completo sem +: DDI + número local */
export const buildFullPhoneNumber = (ddi: string, localPhone: string) =>
  `${sanitizeDigits(ddi)}${sanitizeDigits(localPhone)}`;

/** Monta o ID WhatsApp (ex: 5511999999999@c.us) */
export const buildWhatsappPhoneId = (ddi: string, localPhone: string) =>
  `${buildFullPhoneNumber(ddi, localPhone)}${WHATSAPP_ID_SUFFIX}`;

/** Nome do contato ou fallback padrão */
export const resolveContactName = (name?: string) =>
  name?.trim() || DEFAULT_CONTACT_NAME;

/** Filtra apenas contatos bloqueados */
export const filterBlockedContacts = (contacts: ClientContact[]) =>
  contacts.filter(
    (contact) => contact.block && contact.status.toLowerCase() === BLOCKED_STATUS
  );

/** Filtra contatos que ainda não estão bloqueados */
export const filterUnblockedContacts = (contacts: ClientContact[]) =>
  contacts.filter(
    (contact) =>
      !(contact.block === true && contact.status?.toLowerCase() === BLOCKED_STATUS)
  );

/** Verifica se o número já está bloqueado na lista */
export const findBlockedContactByNumber = (
  contacts: ClientContact[],
  fullNumber: string
) => contacts.find((contact) => contact.phone.includes(fullNumber) && contact.block);

/** Filtra contatos por nome ou telefone */
export const filterContactsByQuery = (contacts: ClientContact[], query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return contacts;

  const queryDigits = sanitizeDigits(normalizedQuery);

  return contacts.filter((contact) => {
    const name = (contact.whatsappName || '').toLowerCase();
    const tag = (contact.tag || '').toLowerCase();
    const phoneDigits = sanitizeDigits(contact.phone || '');

    const matchesName = name.includes(normalizedQuery);
    const matchesTag = tag.includes(normalizedQuery);
    const matchesPhone = queryDigits.length > 0 && phoneDigits.includes(queryDigits);

    return matchesName || matchesTag || matchesPhone;
  });
};

/** Filtra contatos no popup por nome ou número, conforme o modo */
export const filterContactsBySearchMode = (
  contacts: ClientContact[],
  query: string,
  mode: ContactSearchMode
) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return contacts;

  if (mode === 'name') {
    return contacts.filter((contact) =>
      (contact.whatsappName || '').toLowerCase().includes(normalizedQuery)
    );
  }

  const queryDigits = sanitizeDigits(normalizedQuery);
  if (!queryDigits) return [];

  return contacts.filter((contact) =>
    sanitizeDigits(contact.phone || '').includes(queryDigits)
  );
};

/**
 * Separa o telefone salvo (ex: 5511999999999@c.us) em DDI + número local.
 */
export const splitPhoneIntoDdiAndLocal = (phone: string) => {
  const digits = sanitizeDigits(phone);

  if (digits.startsWith(DEFAULT_DDI) && digits.length > DEFAULT_DDI.length) {
    return {
      ddi: DEFAULT_DDI,
      local: digits.slice(DEFAULT_DDI.length),
    };
  }

  if (digits.length > 11) {
    const ddiLength = Math.min(DDI_MAX_LENGTH, digits.length - 11);
    return {
      ddi: digits.slice(0, ddiLength) || DEFAULT_DDI,
      local: digits.slice(ddiLength),
    };
  }

  if (digits.length > 10) {
    const ddiLength = Math.min(DDI_MAX_LENGTH, digits.length - 10);
    return {
      ddi: digits.slice(0, ddiLength) || DEFAULT_DDI,
      local: digits.slice(ddiLength),
    };
  }

  return {
    ddi: DEFAULT_DDI,
    local: digits,
  };
};

/** Retorna a fatia de contatos da página atual */
export const paginateContacts = <T,>(
  items: T[],
  page: number,
  pageSize: number
): T[] => {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

/** Calcula o total de páginas */
export const getTotalPages = (totalItems: number, pageSize: number) =>
  Math.max(1, Math.ceil(totalItems / pageSize));

/** Formata a data de alteração no padrão brasileiro */
export const formatUpdatedAt = (date?: Date | string | null) => {
  if (!date) return null;

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Função para formatar número de telefone
export const formatPhoneNumber = (phone: string) => {
  const cleaned = sanitizeDigits(phone);

  if (cleaned && !phone.includes(WHATSAPP_ID_SUFFIX)) {
    return `${cleaned}${WHATSAPP_ID_SUFFIX}`;
  }

  return cleaned;
};

// Função para validar número de telefone completo
export const validatePhoneNumber = (phone: string) => {
  const cleaned = sanitizeDigits(phone);
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Busca informações detalhadas da sessão conectada
 */
export const fetchSessionInfo = async (
  sessionId: string,
  apiKey: string,
  setSessionInfo: (sessionInfo: SessionInfo) => void
) => {
  try {
    console.log('Tentando buscar informações da sessão: ', sessionId);
    const res = await fetch(api(`/api/sessions/${sessionId}`), {
      headers: { 'x-api-key': apiKey },
    });
    console.log('res: ', res);
    if (res.ok) {
      const data = await res.json();
      setSessionInfo(data?.me ? data.me : {});
    }
  } catch (error) {
    console.error('Erro ao buscar informações da sessão:', error);
  }
};
