import { db } from "./db";
import {
  type Ipo,
  type InsertIpo,
  type WatchlistItem,
  type WatchlistResponse,
  type AlertPreferences,
  type InsertAlertPreferences,
  type AlertLog,
  type InsertAlertLog,
  type GmpHistoryEntry,
  type InsertGmpHistory,
  type PeerCompany,
  type InsertPeerCompany,
  type SubscriptionUpdate,
  type InsertSubscriptionUpdate,
  type FundUtilizationEntry,
  type InsertFundUtilization,
  type IpoTimelineEvent,
  type InsertIpoTimeline,
} from "@shared/schema";
import { authStorage, IAuthStorage } from "./replit_integrations/auth/storage";

// Import Repositories
import { IpoRepository, IIpoRepository } from "./repositories/ipo-repository";
import { WatchlistRepository, IWatchlistRepository } from "./repositories/watchlist-repository";
import { AlertRepository, IAlertRepository } from "./repositories/alert-repository";
import { GmpRepository, IGmpRepository } from "./repositories/gmp-repository";
import { PeerRepository, IPeerRepository } from "./repositories/peer-repository";
import { SubscriptionRepository, ISubscriptionRepository } from "./repositories/subscription-repository";
import { FundUtilizationRepository, IFundUtilizationRepository } from "./repositories/fund-utilization-repository";
import { TimelineRepository, ITimelineRepository } from "./repositories/timeline-repository";

export interface IStorage extends IAuthStorage {
  // Repositories (Publicly exposed for future direct usage)
  ipos: IIpoRepository;
  watchlist: IWatchlistRepository;
  alerts: IAlertRepository;
  gmp: IGmpRepository;
  peers: IPeerRepository;
  subscriptions: ISubscriptionRepository;
  funds: IFundUtilizationRepository;
  timeline: ITimelineRepository;

  // IPOs
  getIpos(status?: string, sector?: string): Promise<Ipo[]>;
  getIpo(id: number): Promise<Ipo | undefined>;
  getIpoBySymbol(symbol: string): Promise<Ipo | undefined>;
  createIpo(ipo: InsertIpo): Promise<Ipo>;
  upsertIpo(ipo: InsertIpo): Promise<Ipo>;
  bulkUpsertIpos(ipos: InsertIpo[]): Promise<Ipo[]>;
  updateIpo(id: number, data: Partial<InsertIpo>): Promise<Ipo | undefined>;
  getIpoCount(): Promise<number>;
  markAllAsListed(): Promise<number>;
  deleteIpo(id: number): Promise<void>;

  // Watchlist
  getWatchlist(userId: string): Promise<WatchlistResponse[]>;
  addToWatchlist(userId: string, ipoId: number): Promise<WatchlistItem>;
  removeFromWatchlist(userId: string, id: number): Promise<void>;
  getWatchlistItem(userId: string, ipoId: number): Promise<WatchlistItem | undefined>;

  // Alert Preferences
  getAlertPreferences(userId: string): Promise<AlertPreferences | undefined>;
  upsertAlertPreferences(userId: string, prefs: Partial<InsertAlertPreferences>): Promise<AlertPreferences>;
  getAllUsersWithAlerts(): Promise<AlertPreferences[]>;

  // Alert Logs
  createAlertLog(log: InsertAlertLog): Promise<AlertLog>;
  getAlertLogs(userId?: string, limit?: number): Promise<AlertLog[]>;

  // GMP History
  addGmpHistory(entry: InsertGmpHistory): Promise<GmpHistoryEntry>;
  getGmpHistory(ipoId: number, days?: number): Promise<GmpHistoryEntry[]>;

  // Peer Companies
  getPeerCompanies(ipoId: number): Promise<PeerCompany[]>;
  addPeerCompany(peer: InsertPeerCompany): Promise<PeerCompany>;
  deletePeerCompanies(ipoId: number): Promise<void>;

  // Subscription Updates
  addSubscriptionUpdate(update: InsertSubscriptionUpdate): Promise<SubscriptionUpdate>;
  getSubscriptionUpdates(ipoId: number): Promise<SubscriptionUpdate[]>;
  getLatestSubscription(ipoId: number): Promise<SubscriptionUpdate | undefined>;

  // Fund Utilization
  getFundUtilization(ipoId: number): Promise<FundUtilizationEntry[]>;
  addFundUtilization(entry: InsertFundUtilization): Promise<FundUtilizationEntry>;
  updateFundUtilization(id: number, data: Partial<InsertFundUtilization>): Promise<FundUtilizationEntry | undefined>;

  // IPO Timeline
  getIpoTimeline(ipoId: number): Promise<IpoTimelineEvent[]>;
  addTimelineEvent(event: InsertIpoTimeline): Promise<IpoTimelineEvent>;
  getAllUpcomingEvents(days?: number): Promise<(IpoTimelineEvent & { ipo: Ipo })[]>;
}

export class DatabaseStorage implements IStorage {
  // Inherit auth methods
  getUser = authStorage.getUser;
  upsertUser = authStorage.upsertUser;

  // Instantiate Repositories
  public ipos = new IpoRepository();
  public watchlist = new WatchlistRepository();
  public alerts = new AlertRepository();
  public gmp = new GmpRepository();
  public peers = new PeerRepository();
  public subscriptions = new SubscriptionRepository();
  public funds = new FundUtilizationRepository();
  public timeline = new TimelineRepository();

  // IPOs
  async getIpos(status?: string, sector?: string): Promise<Ipo[]> {
    return this.ipos.getIpos(status, sector);
  }

  async getIpo(id: number): Promise<Ipo | undefined> {
    return this.ipos.getIpo(id);
  }

  async getIpoBySymbol(symbol: string): Promise<Ipo | undefined> {
    return this.ipos.getIpoBySymbol(symbol);
  }

  async createIpo(insertIpo: InsertIpo): Promise<Ipo> {
    return this.ipos.createIpo(insertIpo);
  }

  async upsertIpo(insertIpo: InsertIpo): Promise<Ipo> {
    return this.ipos.upsertIpo(insertIpo);
  }

  async bulkUpsertIpos(insertIpos: InsertIpo[]): Promise<Ipo[]> {
    return this.ipos.bulkUpsertIpos(insertIpos);
  }

  async updateIpo(id: number, data: Partial<InsertIpo>): Promise<Ipo | undefined> {
    return this.ipos.updateIpo(id, data);
  }

  async getIpoCount(): Promise<number> {
    return this.ipos.getIpoCount();
  }

  async markAllAsListed(): Promise<number> {
    return this.ipos.markAllAsListed();
  }

  async deleteIpo(id: number): Promise<void> {
    return this.ipos.deleteIpo(id);
  }

  // Watchlist
  async getWatchlist(userId: string): Promise<WatchlistResponse[]> {
    return this.watchlist.getWatchlist(userId);
  }

  async getWatchlistItem(userId: string, ipoId: number): Promise<WatchlistItem | undefined> {
    return this.watchlist.getWatchlistItem(userId, ipoId);
  }

  async addToWatchlist(userId: string, ipoId: number): Promise<WatchlistItem> {
    return this.watchlist.addToWatchlist(userId, ipoId);
  }

  async removeFromWatchlist(userId: string, id: number): Promise<void> {
    return this.watchlist.removeFromWatchlist(userId, id);
  }

  // Alert Preferences
  async getAlertPreferences(userId: string): Promise<AlertPreferences | undefined> {
    return this.alerts.getAlertPreferences(userId);
  }

  async upsertAlertPreferences(userId: string, prefs: Partial<InsertAlertPreferences>): Promise<AlertPreferences> {
    return this.alerts.upsertAlertPreferences(userId, prefs);
  }

  async getAllUsersWithAlerts(): Promise<AlertPreferences[]> {
    return this.alerts.getAllUsersWithAlerts();
  }

  // Alert Logs
  async createAlertLog(log: InsertAlertLog): Promise<AlertLog> {
    return this.alerts.createAlertLog(log);
  }

  async getAlertLogs(userId?: string, limit: number = 50): Promise<AlertLog[]> {
    return this.alerts.getAlertLogs(userId, limit);
  }

  // GMP History
  async addGmpHistory(entry: InsertGmpHistory): Promise<GmpHistoryEntry> {
    return this.gmp.addGmpHistory(entry);
  }

  async getGmpHistory(ipoId: number, days: number = 7): Promise<GmpHistoryEntry[]> {
    return this.gmp.getGmpHistory(ipoId, days);
  }

  // Peer Companies
  async getPeerCompanies(ipoId: number): Promise<PeerCompany[]> {
    return this.peers.getPeerCompanies(ipoId);
  }

  async addPeerCompany(peer: InsertPeerCompany): Promise<PeerCompany> {
    return this.peers.addPeerCompany(peer);
  }

  async deletePeerCompanies(ipoId: number): Promise<void> {
    return this.peers.deletePeerCompanies(ipoId);
  }

  // Subscription Updates
  async addSubscriptionUpdate(update: InsertSubscriptionUpdate): Promise<SubscriptionUpdate> {
    return this.subscriptions.addSubscriptionUpdate(update);
  }

  async getSubscriptionUpdates(ipoId: number): Promise<SubscriptionUpdate[]> {
    return this.subscriptions.getSubscriptionUpdates(ipoId);
  }

  async getLatestSubscription(ipoId: number): Promise<SubscriptionUpdate | undefined> {
    return this.subscriptions.getLatestSubscription(ipoId);
  }

  // Fund Utilization
  async getFundUtilization(ipoId: number): Promise<FundUtilizationEntry[]> {
    return this.funds.getFundUtilization(ipoId);
  }

  async addFundUtilization(entry: InsertFundUtilization): Promise<FundUtilizationEntry> {
    return this.funds.addFundUtilization(entry);
  }

  async updateFundUtilization(id: number, data: Partial<InsertFundUtilization>): Promise<FundUtilizationEntry | undefined> {
    return this.funds.updateFundUtilization(id, data);
  }

  // IPO Timeline
  async getIpoTimeline(ipoId: number): Promise<IpoTimelineEvent[]> {
    return this.timeline.getIpoTimeline(ipoId);
  }

  async addTimelineEvent(event: InsertIpoTimeline): Promise<IpoTimelineEvent> {
    return this.timeline.addTimelineEvent(event);
  }

  async getAllUpcomingEvents(days: number = 30): Promise<(IpoTimelineEvent & { ipo: Ipo })[]> {
    return this.timeline.getAllUpcomingEvents(days);
  }
}

export const storage = new DatabaseStorage();
