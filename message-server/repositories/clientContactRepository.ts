import { ClientContactModel } from "../models/ClientContact";
import { ClientContact, CreateClientContact, UpdateClientContact } from "../schemas/ClientContactSchema";

export class ClientContactRepository {
  async findContactByPhoneNumber(phone: string): Promise<ClientContact | null> {
    return ClientContactModel.findOne({ phone });
  }

  async listAllContacts(): Promise<ClientContact[]> {
    return ClientContactModel.find().exec();
  }

  async listContactsNotBlockedAndNotDeletedByCutoffDate(cutoff: Date): Promise<ClientContact[]> {
    // buscar todos e filtrar em memória
    const all = await ClientContactModel.find({
      $nor: [{ block: true, status: "bloqueado" }]
    });

    return all.filter((c: ClientContact) => c.updatedAt && new Date(c.updatedAt) < cutoff);
  }

  async insertNewContact(data: CreateClientContact): Promise<ClientContact> {
    const contact = new ClientContactModel(data);
    return contact.save();
  }

  async updateContactByPhone(phone: string, newDocument: Partial<UpdateClientContact>) {
    // Remove undefined para não apagar campos acidentalmente; null é permitido (ex.: limpar tag)
    const sanitizedUpdate = Object.fromEntries(
      Object.entries(newDocument).filter(([, value]) => value !== undefined)
    );

    return ClientContactModel.findOneAndUpdate(
      { phone },
      { $set: { ...sanitizedUpdate, updatedAt: new Date() } },
      { new: true, runValidators: true, timestamps: true }
    );
  }

  async deleteContactByPhoneNumber(phone: string) {
    return ClientContactModel.deleteOne({ phone });
  }

  async deleteManyContactsByPhone(phones: string[]) {
    return ClientContactModel.deleteMany({ phone: { $in: phones } });
  }
}
