import { db } from "../db";
import {
  peerCompanies,
  type PeerCompany,
  type InsertPeerCompany,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IPeerRepository {
  getPeerCompanies(ipoId: number): Promise<PeerCompany[]>;
  addPeerCompany(peer: InsertPeerCompany): Promise<PeerCompany>;
  deletePeerCompanies(ipoId: number): Promise<void>;
  getAllPeerCompanies(): Promise<PeerCompany[]>;
}

export class PeerRepository implements IPeerRepository {
  async getPeerCompanies(ipoId: number): Promise<PeerCompany[]> {
    return await db
      .select()
      .from(peerCompanies)
      .where(eq(peerCompanies.ipoId, ipoId));
  }

  async addPeerCompany(peer: InsertPeerCompany): Promise<PeerCompany> {
    const [created] = await db.insert(peerCompanies).values(peer).returning();
    return created;
  }

  async deletePeerCompanies(ipoId: number): Promise<void> {
    await db.delete(peerCompanies).where(eq(peerCompanies.ipoId, ipoId));
  }

  async getAllPeerCompanies(): Promise<PeerCompany[]> {
    return await db.select().from(peerCompanies);
  }
}
