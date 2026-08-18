import { prisma } from '../client';
import { Client } from '@prisma/client';

export class ClientRepository {
  static async create(data: {
    name: string;
    company: string;
    contactEmail?: string;
    division?: string;
    notes?: string;
  }): Promise<Client> {
    return prisma.client.create({
      data: {
        name: data.name,
        company: data.company,
        contactEmail: data.contactEmail,
        division: data.division || 'KRAXXSEC',
        notes: data.notes,
      },
    });
  }

  static async listAll(): Promise<Client[]> {
    return prisma.client.findMany({
      orderBy: { company: 'asc' },
    });
  }
}
