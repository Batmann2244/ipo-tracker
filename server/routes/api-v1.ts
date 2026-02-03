import { Router, Response } from 'express';
import { db } from '../db';
import { ipos, gmpHistory, subscriptionUpdates, peerCompanies } from '@shared/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { apiKeyAuth, rateLimiter, tierRequired, logRequest, AuthenticatedApiRequest } from '../middleware/api-auth';

const router = Router();

router.use(apiKeyAuth(true));
router.use(rateLimiter());
router.use(logRequest());

router.get('/ipos/upcoming', async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    const upcomingIpos = await db.select({
      symbol: ipos.symbol,
      companyName: ipos.companyName,
      status: ipos.status,
      priceRange: ipos.priceRange,
      lotSize: ipos.lotSize,
      issueSize: ipos.issueSize,
      expectedDate: ipos.expectedDate,
      sector: ipos.sector,
      gmp: ipos.gmp,
    })
    .from(ipos)
    .where(eq(ipos.status, 'upcoming'))
    .limit(limit);
    
    res.json({
      success: true,
      data: upcomingIpos,
      count: upcomingIpos.length,
      tier: req.apiKey?.tier,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ipos/open', async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const openIpos = await db.select({
      symbol: ipos.symbol,
      companyName: ipos.companyName,
      status: ipos.status,
      priceRange: ipos.priceRange,
      lotSize: ipos.lotSize,
      issueSize: ipos.issueSize,
      expectedDate: ipos.expectedDate,
      sector: ipos.sector,
      gmp: ipos.gmp,
      subscriptionQib: ipos.subscriptionQib,
      subscriptionHni: ipos.subscriptionHni,
      subscriptionRetail: ipos.subscriptionRetail,
    })
    .from(ipos)
    .where(eq(ipos.status, 'open'));
    
    res.json({
      success: true,
      data: openIpos,
      count: openIpos.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ipos', async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    let query = db.select({
      symbol: ipos.symbol,
      companyName: ipos.companyName,
      status: ipos.status,
      priceRange: ipos.priceRange,
      lotSize: ipos.lotSize,
      issueSize: ipos.issueSize,
      expectedDate: ipos.expectedDate,
      sector: ipos.sector,
      gmp: ipos.gmp,
      subscriptionQib: ipos.subscriptionQib,
      subscriptionHni: ipos.subscriptionHni,
      subscriptionRetail: ipos.subscriptionRetail,
      overallScore: ipos.overallScore,
      riskLevel: ipos.riskLevel,
    }).from(ipos);
    
    if (status && ['upcoming', 'open', 'closed'].includes(status)) {
      query = query.where(eq(ipos.status, status)) as typeof query;
    }
    
    const results = await query.limit(limit).offset(offset);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ipos/:symbol', async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const symbolParam = req.params.symbol;
    const symbol = (Array.isArray(symbolParam) ? symbolParam[0] : symbolParam).toUpperCase();
    
    const [ipo] = await db.select().from(ipos).where(eq(ipos.symbol, symbol));
    
    if (!ipo) {
      return res.status(404).json({ success: false, error: 'IPO not found' });
    }
    
    const basicData = {
      symbol: ipo.symbol,
      companyName: ipo.companyName,
      status: ipo.status,
      priceRange: ipo.priceRange,
      lotSize: ipo.lotSize,
      issueSize: ipo.issueSize,
      expectedDate: ipo.expectedDate,
      sector: ipo.sector,
      gmp: ipo.gmp,
      subscriptionQib: ipo.subscriptionQib,
      subscriptionHni: ipo.subscriptionHni,
      subscriptionRetail: ipo.subscriptionRetail,
    };
    
    if (req.apiKey?.tier === 'free') {
      return res.json({ success: true, data: basicData });
    }
    
    const proData = {
      ...basicData,
      overallScore: ipo.overallScore,
      fundamentalsScore: ipo.fundamentalsScore,
      valuationScore: ipo.valuationScore,
      governanceScore: ipo.governanceScore,
      riskLevel: ipo.riskLevel,
      redFlags: ipo.redFlags,
      pros: ipo.pros,
      revenueGrowth: ipo.revenueGrowth,
      ebitdaMargin: ipo.ebitdaMargin,
      roe: ipo.roe,
      roce: ipo.roce,
      debtToEquity: ipo.debtToEquity,
      peRatio: ipo.peRatio,
      pbRatio: ipo.pbRatio,
      ofsRatio: ipo.ofsRatio,
      promoterHolding: ipo.promoterHolding,
    };
    
    if (req.apiKey?.tier === 'pro' || req.apiKey?.tier === 'enterprise') {
      return res.json({ 
        success: true, 
        data: {
          ...proData,
          aiSummary: ipo.aiSummary,
          aiRecommendation: ipo.aiRecommendation,
        }
      });
    }
    
    res.json({ success: true, data: proData });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ipos/:symbol/live', tierRequired('basic'), async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const symbolParam = req.params.symbol;
    const symbol = (Array.isArray(symbolParam) ? symbolParam[0] : symbolParam).toUpperCase();
    
    const [ipo] = await db.select().from(ipos).where(eq(ipos.symbol, symbol));
    
    if (!ipo) {
      return res.status(404).json({ success: false, error: 'IPO not found' });
    }
    
    const [latestGmp] = await db.select()
      .from(gmpHistory)
      .where(eq(gmpHistory.ipoId, ipo.id))
      .orderBy(desc(gmpHistory.recordedAt))
      .limit(1);
    
    const [latestSubscription] = await db.select()
      .from(subscriptionUpdates)
      .where(eq(subscriptionUpdates.ipoId, ipo.id))
      .orderBy(desc(subscriptionUpdates.recordedAt))
      .limit(1);
    
    res.json({
      success: true,
      data: {
        symbol: ipo.symbol,
        companyName: ipo.companyName,
        status: ipo.status,
        gmp: latestGmp?.gmp || ipo.gmp,
        gmpPercentage: latestGmp?.gmpPercentage,
        gmpUpdatedAt: latestGmp?.recordedAt,
        subscription: latestSubscription ? {
          qib: latestSubscription.qibSubscription,
          hni: latestSubscription.niiSubscription,
          retail: latestSubscription.retailSubscription,
          total: latestSubscription.totalSubscription,
          updatedAt: latestSubscription.recordedAt,
        } : {
          qib: ipo.subscriptionQib,
          hni: ipo.subscriptionHni,
          retail: ipo.subscriptionRetail,
        },
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ipos/:symbol/history', tierRequired('basic'), async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const symbolParam = req.params.symbol;
    const symbol = (Array.isArray(symbolParam) ? symbolParam[0] : symbolParam).toUpperCase();
    const days = Math.min(parseInt(req.query.days as string) || 7, req.tierLimits?.historyDays || 7);
    
    const [ipo] = await db.select().from(ipos).where(eq(ipos.symbol, symbol));
    
    if (!ipo) {
      return res.status(404).json({ success: false, error: 'IPO not found' });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const gmpHistoryData = await db.select()
      .from(gmpHistory)
      .where(and(
        eq(gmpHistory.ipoId, ipo.id),
        gte(gmpHistory.recordedAt, startDate)
      ))
      .orderBy(gmpHistory.recordedAt);
    
    const subscriptionHistory = await db.select()
      .from(subscriptionUpdates)
      .where(and(
        eq(subscriptionUpdates.ipoId, ipo.id),
        gte(subscriptionUpdates.recordedAt, startDate)
      ))
      .orderBy(subscriptionUpdates.recordedAt);
    
    res.json({
      success: true,
      data: {
        symbol: ipo.symbol,
        companyName: ipo.companyName,
        gmpHistory: gmpHistoryData.map(g => ({
          gmp: g.gmp,
          percentage: g.gmpPercentage,
          recordedAt: g.recordedAt,
        })),
        subscriptionHistory: subscriptionHistory.map(s => ({
          qib: s.qibSubscription,
          hni: s.niiSubscription,
          retail: s.retailSubscription,
          total: s.totalSubscription,
          recordedAt: s.recordedAt,
        })),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ipos/:symbol/peers', tierRequired('pro'), async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const symbolParam = req.params.symbol;
    const symbol = (Array.isArray(symbolParam) ? symbolParam[0] : symbolParam).toUpperCase();
    
    const [ipo] = await db.select().from(ipos).where(eq(ipos.symbol, symbol));
    
    if (!ipo) {
      return res.status(404).json({ success: false, error: 'IPO not found' });
    }
    
    const peers = await db.select()
      .from(peerCompanies)
      .where(eq(peerCompanies.ipoId, ipo.id));
    
    res.json({
      success: true,
      data: {
        symbol: ipo.symbol,
        companyName: ipo.companyName,
        peers: peers.map(p => ({
          name: p.companyName,
          symbol: p.symbol,
          marketCap: p.marketCap,
          peRatio: p.peRatio,
          pbRatio: p.pbRatio,
          roe: p.roe,
          roce: p.roce,
          revenueGrowth: p.revenueGrowth,
        })),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/gmp/live', async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const allIpos = await db.select({
      id: ipos.id,
      symbol: ipos.symbol,
      companyName: ipos.companyName,
      status: ipos.status,
      gmp: ipos.gmp,
      priceRange: ipos.priceRange,
    })
    .from(ipos)
    .where(eq(ipos.status, 'open'));
    
    const gmpData = await Promise.all(allIpos.map(async (ipo) => {
      const [latestGmp] = await db.select()
        .from(gmpHistory)
        .where(eq(gmpHistory.ipoId, ipo.id))
        .orderBy(desc(gmpHistory.recordedAt))
        .limit(1);
      
      return {
        symbol: ipo.symbol,
        companyName: ipo.companyName,
        gmp: latestGmp?.gmp || ipo.gmp || 0,
        gmpPercentage: latestGmp?.gmpPercentage,
        priceRange: ipo.priceRange,
        updatedAt: latestGmp?.recordedAt,
      };
    }));
    
    res.json({
      success: true,
      data: gmpData,
      count: gmpData.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/subscription/live', async (req: AuthenticatedApiRequest, res: Response) => {
  try {
    const openIpos = await db.select({
      id: ipos.id,
      symbol: ipos.symbol,
      companyName: ipos.companyName,
      subscriptionQib: ipos.subscriptionQib,
      subscriptionHni: ipos.subscriptionHni,
      subscriptionRetail: ipos.subscriptionRetail,
    })
    .from(ipos)
    .where(eq(ipos.status, 'open'));
    
    const subscriptionData = await Promise.all(openIpos.map(async (ipo) => {
      const [latest] = await db.select()
        .from(subscriptionUpdates)
        .where(eq(subscriptionUpdates.ipoId, ipo.id))
        .orderBy(desc(subscriptionUpdates.recordedAt))
        .limit(1);
      
      return {
        symbol: ipo.symbol,
        companyName: ipo.companyName,
        subscription: {
          qib: latest?.qibSubscription || ipo.subscriptionQib || 0,
          hni: latest?.niiSubscription || ipo.subscriptionHni || 0,
          retail: latest?.retailSubscription || ipo.subscriptionRetail || 0,
          total: latest?.totalSubscription || 0,
        },
        updatedAt: latest?.recordedAt,
      };
    }));
    
    res.json({
      success: true,
      data: subscriptionData,
      count: subscriptionData.length,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'IPO Analyzer API v1',
    version: '1.0.0',
    tier: (req as AuthenticatedApiRequest).apiKey?.tier || 'unknown',
  });
});

export default router;
