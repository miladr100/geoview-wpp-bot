import express, { Request, Response } from "express";
import { ClientContactRepository } from "../repositories/clientContactRepository";
import { MessagesRepository } from "../repositories/messagesRepository";

const router = express.Router();
const clientContactRepository = new ClientContactRepository();
const messagesRepository = new MessagesRepository();
const DAYS_TO_KEEP = 60; // 60 dias

// GET /api/contacts
router.get("/", async (_: Request, res: Response) => {
    try {
        console.log("🧹 Limpando dados antigos...");

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);
        console.log(`📅 Data de corte: ${cutoff.toISOString()}`);

        // 1. Buscar os contatos que atendem aos critérios
        const contactsToDelete = await clientContactRepository.listContactsNotBlockedAndNotDeletedByCutoffDate(cutoff);

        if (contactsToDelete.length === 0) {
            console.log("ℹ️ Nenhum contato encontrado para remoção.");
            return res.json({ deletedContactsCount: 0, deletedMessagesCount: 0 });
        }

        // 2. Extrair os phones dos contatos encontrados
        const phonesToDelete = contactsToDelete.map(contact => contact.phone);
        console.log(`📋 Encontrados ${contactsToDelete.length} contatos para remoção: ${phonesToDelete.join(', ')}`);

        // 3. Apagar as Messages relacionadas (sessionId = phone)
        const messagesResult = await messagesRepository.deleteManyMessagesBySessionId(phonesToDelete);
        console.log(`🗑️ ${messagesResult.deletedCount} mensagens apagadas.`);

        // 4. Apagar os ClientContact
        const contactsResult = await clientContactRepository.deleteManyContactsByPhone(phonesToDelete);
        console.log(`🗑️ ${contactsResult.deletedCount} contatos apagados.`);

        return res.json({ deletedContactsCount: contactsResult.deletedCount, deletedMessagesCount: messagesResult.deletedCount });
    } catch (err) {
        console.error("❌ Erro ao apagar documentos:", err);
    }
});



export default router;
