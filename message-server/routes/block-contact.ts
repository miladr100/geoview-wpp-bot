import express, { Request, Response } from "express";
import { ZodError } from "zod";

const router = express.Router();
import { API_URL } from '../utils/consts';
import { API_KEY } from "../env";

// POST /api/contacts
router.post("/", async (req: Request, res: Response) => {
  try {
    const { phone, name, tag } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Número de telefone obrigatório' });
    }

    const whatsappName = name || "Desconhecido";
    const normalizedTag = typeof tag === "string" && tag.trim() ? tag.trim() : null;

    const newContact = {
        phone,
        whatsappName,
        tag: normalizedTag,
        status: "bloqueado",
        block: true,
        hasMedia: false,
        lastMessageId: "",
        running: false,
    };
    const result = await fetch(`${API_URL}/api/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify(newContact),
    });

    if(result.ok) {
      const savedContact = await result.json();
      console.log("Contato bloqueado com sucesso", phone, "tag:", savedContact?.tag ?? normalizedTag);
      return res.json({
        ...savedContact,
        message: 'Contato bloqueado com sucesso',
        phone: savedContact?.phone ?? phone,
        whatsappName: savedContact?.whatsappName ?? whatsappName,
        tag: savedContact?.tag ?? normalizedTag,
        status: savedContact?.status ?? "bloqueado",
        block: savedContact?.block ?? true,
        updatedAt: savedContact?.updatedAt ?? new Date().toISOString(),
      });
    } else {
      const errorBody = await result.text().catch(() => '');
      console.error("Erro ao bloquear contato", result.status, result.statusText, errorBody);
      return res.status(500).json({ success: false, error: "Erro ao bloquear contato" });
    }
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Erro de validação",
        issues: err.flatten(),
      });
    }

    console.error("Erro inesperado ao criar contato:", err);
    return res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

export default router;