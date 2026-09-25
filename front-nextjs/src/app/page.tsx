'use client';
// pages
import { useEffect, useState } from 'react';
import {
  messageApi,
  messageApiRequest,
  fetchSessionInfo,
  sanitizeDdi,
  maskLocalPhoneNumber,
  validateLocalPhoneNumber,
  buildFullPhoneNumber,
  buildWhatsappPhoneId,
  resolveContactName,
  filterBlockedContacts,
  filterUnblockedContacts,
  findBlockedContactByNumber,
  filterContactsByQuery,
  filterContactsBySearchMode,
  splitPhoneIntoDdiAndLocal,
  paginateContacts,
  getTotalPages,
  formatUpdatedAt,
} from '@/utils/functions';
import {
  DEFAULT_DDI,
  DDI_MAX_LENGTH,
  CONTACTS_PER_PAGE,
  SEARCH_RESULTS_LIMIT,
  ContactSearchMode,
} from '@/utils/consts';
import {
  getDefaultSessionId,
  getApiKey,
  getWhatsappApiBaseUrl,
  getMessageApiBaseUrl,
} from '@/utils/config';
import { ClientContact, SessionInfo } from '@/utils/types';

import './page.css';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [allContacts, setAllContacts] = useState<ClientContact[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ddi, setDdi] = useState(DEFAULT_DDI);
  const [whatsappName, setWhatsappName] = useState('');
  const [tag, setTag] = useState('');
  const [contactFilter, setContactFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<ContactSearchMode>('name');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const filteredContacts = filterContactsByQuery(contacts, contactFilter);
  const totalPages = getTotalPages(filteredContacts.length, CONTACTS_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedContacts = paginateContacts(
    filteredContacts,
    safePage,
    CONTACTS_PER_PAGE
  );

  const unblockedContacts = filterUnblockedContacts(allContacts);
  const searchableContacts = filterContactsBySearchMode(
    unblockedContacts,
    searchQuery,
    searchMode
  ).slice(0, SEARCH_RESULTS_LIMIT);

  // ===== CONFIGURAÇÕES =====
  const sessionId = getDefaultSessionId();
  const apiKey = getApiKey();
  const apiBaseUrl = getWhatsappApiBaseUrl();
  const messageApiBaseUrl = getMessageApiBaseUrl();

  useEffect(() => {
    setCurrentPage(1);
  }, [contactFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch(messageApi('/ping'));
        const result = await res.json();
        if (result?.ok) {
          setIsReady(true);
          fetchSessionInfo(sessionId, apiKey, setSessionInfo);
        } else {
          setIsReady(false);
          setIsServerOnline(false);
        }
      } catch (err) {
        console.error('Erro ao conectar com o servidor:', err);
        setIsReady(false);
        setIsServerOnline(false);
      }
    };

    checkServer();
  }, []);

  // Carregar contatos ao iniciar
  useEffect(() => {
    messageApiRequest('/contacts?all=true')
      .then((res) => res.json())
      .then((data: ClientContact[]) => {
        setAllContacts(data || []);
        console.log('Todos os contatos carregados:', data);
        return filterBlockedContacts(data || []);
      })
      .then((data) => setContacts(data || []))
      .catch((err) => console.error('Erro ao buscar contatos', err));
  }, [isReady]);

  const handleDdiChange = (value: string) => {
    const nextDdi = sanitizeDdi(value);
    setDdi(nextDdi);
    setPhoneNumber((prev) => maskLocalPhoneNumber(prev, nextDdi));
  };

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(maskLocalPhoneNumber(value, ddi));
  };

  const openSearchModal = () => {
    setSearchQuery('');
    setSearchMode('name');
    setIsSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchQuery('');
  };

  const handleSelectContactToBlock = (contact: ClientContact) => {
    const { ddi: contactDdi, local } = splitPhoneIntoDdiAndLocal(contact.phone);
    setWhatsappName(contact.whatsappName || '');
    setTag(contact.tag || '');
    setDdi(sanitizeDdi(contactDdi));
    setPhoneNumber(maskLocalPhoneNumber(local, contactDdi));
    closeSearchModal();
  };

  const handleBlockContact = async () => {
    if (!ddi) {
      alert('DDI é obrigatório');
      return;
    }
    if (!phoneNumber) {
      alert('Número de telefone é obrigatório');
      return;
    }
    const localNumber = maskLocalPhoneNumber(phoneNumber, ddi);
    if (!validateLocalPhoneNumber(localNumber)) {
      alert('Número inválido. Informe o número com DDD (sem o código do país).');
      return;
    }

    const fullNumber = buildFullPhoneNumber(ddi, localNumber);

    if (findBlockedContactByNumber(allContacts, fullNumber)) {
      alert('Contato já existe e está bloqueado.');
      return;
    }

    const newDocument = {
      phone: buildWhatsappPhoneId(ddi, localNumber),
      name: resolveContactName(whatsappName),
      tag: tag.trim() || null,
    };
    const res = await messageApiRequest('/block-contact', {
      method: 'POST',
      body: JSON.stringify(newDocument),
    });

    if (res.ok) {
      const saved = await res.json();
      setContacts((prev) => [...prev, saved]);
      setAllContacts((prev) => {
        const index = prev.findIndex((contact) => contact.phone === saved.phone);
        if (index === -1) return [...prev, saved];
        const next = [...prev];
        next[index] = { ...next[index], ...saved };
        return next;
      });
      setPhoneNumber('');
      setDdi(DEFAULT_DDI);
      setWhatsappName('');
      setTag('');
    } else {
      console.error('Erro ao adicionar contato');
    }
  };

  const handleDeleteContact = async (phone: string) => {
    const res = await messageApiRequest(`/contacts?phone=${phone}`, { method: 'DELETE' });
    const response = await res.json();
    if (response.success) {
      setContacts((prev) => prev.filter((c) => c.phone !== phone));
      setAllContacts((prev) => prev.filter((c) => c.phone !== phone));
      alert(`Contato ${phone} removido com sucesso!`);
    } else {
      console.error('Erro ao remover contato');
    }
  };

  const openEditModal = (contact: ClientContact) => {
    setEditingContact(contact);
    setEditName(contact.whatsappName || '');
    setEditTag(contact.tag || '');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingContact(null);
    setEditName('');
    setEditTag('');
    setIsSavingEdit(false);
  };

  const handleSaveContactEdit = async () => {
    if (!editingContact) return;

    setIsSavingEdit(true);
    try {
      const res = await messageApiRequest('/contacts', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: editingContact.phone,
          whatsappName: resolveContactName(editName),
          tag: editTag.trim() || null,
        }),
      });

      if (!res.ok) {
        console.error('Erro ao editar contato');
        alert('Não foi possível salvar as alterações.');
        return;
      }

      const updated = await res.json();
      const nextContact: ClientContact = {
        ...editingContact,
        ...updated,
        whatsappName: updated.whatsappName ?? resolveContactName(editName),
        tag: updated.tag ?? (editTag.trim() || null),
        updatedAt: updated.updatedAt ?? new Date().toISOString(),
      };

      setContacts((prev) =>
        prev.map((contact) =>
          contact.phone === editingContact.phone ? nextContact : contact
        )
      );
      setAllContacts((prev) =>
        prev.map((contact) =>
          contact.phone === editingContact.phone ? nextContact : contact
        )
      );
      closeEditModal();
    } catch (err) {
      console.error('Erro ao editar contato:', err);
      alert('Não foi possível salvar as alterações.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * Componente para exibir informações da sessão
   */
  const SessionInfoDisplay = () => {
    return (
      sessionInfo !== null && (
        <div className="session-info">
          {sessionInfo ? (
            <>
              <h3>✅ Sessão Conectada</h3>
              <p>
                <strong>Nome:</strong> {sessionInfo?.pushName}
              </p>
              <p>
                <strong>Telefone:</strong> {sessionInfo?.id}
              </p>
              <p>
                <strong>ID da Sessão:</strong> {sessionId}
              </p>
              <a href={`${apiBaseUrl}/dashboard`} target="_blank" rel="noopener noreferrer">
                <button className="form-button add">Dashboard</button>
              </a>
            </>
          ) : (
            <h3>❌ Sessão Desconectada</h3>
          )}
        </div>
      )
    );
  };

  return (
    <>
      {isReady && isServerOnline ? (
        <div className="page-container">
          <h1 className="contacts-title">Bloquear Contatos</h1>
          <div className="session-info-container">
            <SessionInfoDisplay />
          </div>

          <div className="form-container">
            <div className="form-input-container">
              <input
                type="text"
                placeholder="👤 Nome do contato (opcional)"
                value={whatsappName}
                onChange={(e) => setWhatsappName(e.target.value)}
                className="form-input"
              />
              <input
                type="text"
                placeholder="🏷️ TAG (opcional)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="form-input"
              />
              <div className="phone-input-group form-input-full">
                <div className="ddi-field">
                  <span className="ddi-prefix" aria-hidden="true">
                    +
                  </span>
                  <input
                    type="text"
                    className="ddi-input"
                    value={ddi}
                    onChange={(e) => handleDdiChange(e.target.value)}
                    inputMode="numeric"
                    maxLength={DDI_MAX_LENGTH}
                    aria-label="Código do país (DDI)"
                    title="DDI (até 3 dígitos)"
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Número com DDD (ex: 11999999999)"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  className="form-input phone-number-input"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={openSearchModal}
                className="form-button secondary"
              >
                🔍 Buscar contatos
              </button>
              <button type="button" onClick={handleBlockContact} className="form-button add">
                🚫 Bloquear Contato
              </button>
            </div>
          </div>

          <div className="filter-container">
            <input
              type="search"
              className="form-input filter-input"
              placeholder="🔍 Filtrar por nome, tag ou telefone"
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              aria-label="Filtrar contatos por nome, tag ou telefone"
            />
          </div>

          <ul className="contacts-table">
            {contacts.length === 0 ? (
              <li className="contacts-item">
                <div className="contact-info">
                  <div className="contact-name">📝 Nenhum contato bloqueado</div>
                  <div className="contact-phone">Adicione contatos usando o formulário acima</div>
                </div>
              </li>
            ) : filteredContacts.length === 0 ? (
              <li className="contacts-item">
                <div className="contact-info">
                  <div className="contact-name">🔎 Nenhum resultado</div>
                  <div className="contact-phone">Tente outro nome ou número</div>
                </div>
              </li>
            ) : (
              paginatedContacts.map((contact) => {
                const updatedAtLabel = formatUpdatedAt(contact.updatedAt);

                return (
                  <li key={contact.phone} className="contacts-item">
                    <div className="contact-info">
                      <div className="contact-header">
                        <div className="contact-name">{contact.whatsappName || 'Sem nome'}</div>
                        {contact.tag && <span className="contact-tag">🏷️ {contact.tag}</span>}
                      </div>
                      <div className="contact-phone">📞 {contact?.phone?.split('@')?.[0]}</div>
                      {updatedAtLabel && (
                        <div className="contact-updated">🗓️ Alterado em {updatedAtLabel}</div>
                      )}
                    </div>
                    <div className="contact-actions">
                      <button
                        type="button"
                        onClick={() => openEditModal(contact)}
                        className="edit-button"
                        title="Editar nome e tag do contato"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.phone)}
                        className="remove-button"
                        title="Remover contato da lista de bloqueados"
                      >
                        🗑️ Remover
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {filteredContacts.length > 0 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage <= 1}
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {safePage} de {totalPages}
              </span>
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage >= totalPages}
              >
                Próxima
              </button>
            </div>
          )}

          {isSearchModalOpen && (
            <div
              className="modal-overlay"
              onClick={closeSearchModal}
              role="presentation"
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="search-contacts-title"
              >
                <div className="modal-header">
                  <h2 id="search-contacts-title">Buscar contatos a bloquear</h2>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={closeSearchModal}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-search-controls">
                  <input
                    type="search"
                    className="form-input filter-input"
                    placeholder={
                      searchMode === 'name'
                        ? 'Pesquisar por nome...'
                        : 'Pesquisar por número...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />

                  <label className="search-mode-switch">
                    <span className={searchMode === 'name' ? 'active' : ''}>Nome</span>
                    <input
                      type="checkbox"
                      checked={searchMode === 'phone'}
                      onChange={(e) =>
                        setSearchMode(e.target.checked ? 'phone' : 'name')
                      }
                      aria-label="Alternar busca entre nome e número"
                    />
                    <span className="switch-track" aria-hidden="true">
                      <span className="switch-thumb" />
                    </span>
                    <span className={searchMode === 'phone' ? 'active' : ''}>Número</span>
                  </label>
                </div>

                <ul className="modal-results">
                  {unblockedContacts.length === 0 ? (
                    <li className="modal-empty">Nenhum contato disponível para bloquear</li>
                  ) : searchableContacts.length === 0 ? (
                    <li className="modal-empty">Nenhum resultado para a busca</li>
                  ) : (
                    searchableContacts.map((contact) => (
                      <li key={contact.phone} className="modal-result-item">
                        <div className="contact-info">
                          <div className="contact-name">
                            {contact.whatsappName || 'Sem nome'}
                          </div>
                          <div className="contact-phone">
                            📞 {contact.phone?.split('@')?.[0]}
                          </div>
                          {contact.tag && (
                            <div className="contact-tag">🏷️ {contact.tag}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="select-button"
                          onClick={() => handleSelectContactToBlock(contact)}
                        >
                          Selecionar
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {isEditModalOpen && editingContact && (
            <div
              className="modal-overlay"
              onClick={closeEditModal}
              role="presentation"
            >
              <div
                className="modal-content modal-content-sm"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-contact-title"
              >
                <div className="modal-header">
                  <h2 id="edit-contact-title">Editar contato</h2>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={closeEditModal}
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <p className="modal-subtitle">
                  📞 {editingContact.phone?.split('@')?.[0]}
                </p>

                <div className="modal-edit-fields">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="👤 Nome do contato"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🏷️ TAG (opcional)"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                  />
                </div>

                <div className="modal-edit-actions">
                  <button
                    type="button"
                    className="form-button secondary"
                    onClick={closeEditModal}
                    disabled={isSavingEdit}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="form-button add"
                    onClick={handleSaveContactEdit}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isServerOnline ? (
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h2>Carregando aplicação...</h2>
            <p>Conectando ao servidor de mensagens</p>
          </div>
        </div>
      ) : (
        <div className="page-container">
          <div className="error-container">
            <h2>🔌 Servidor Offline</h2>
            <p>Não foi possível conectar ao servidor de mensagens.</p>
            <p>
              Verifique se o servidor está rodando na porta{' '}
              <a href={`${messageApiBaseUrl}/api/ping`} target="_blank" rel="noopener noreferrer">
                {messageApiBaseUrl}
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </>
  );
}
