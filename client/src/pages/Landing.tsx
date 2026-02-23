import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap, BarChart3, ChevronUp, ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useIpos } from "@/hooks/use-ipos";
import { IpoCard } from "@/components/IpoCard";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Ipo } from "@shared/schema";

function TickerItem({ name, gmp, isPositive }: { name: string; gmp: number; isPositive: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-4 whitespace-nowrap">
      <span className="font-semibold text-white">{name}</span>
      <span className={`flex items-center gap-0.5 font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {gmp > 0 ? '+' : ''}₹{Math.abs(gmp)}
      </span>
    </div>
  );
}

function ScrollingTicker() {
  const { data: ipos } = useIpos({});
  
  const tickerItems = (ipos || [])
    .filter(ipo => ipo.gmp !== null && ipo.gmp !== undefined)
    .slice(0, 15)
    .map(ipo => ({
      name: ipo.symbol || ipo.companyName.split(' ')[0].toUpperCase().slice(0, 10),
      gmp: ipo.gmp || 0, // Show raw GMP value in Rs
      isPositive: (ipo.gmp || 0) >= 0
    }));
  
  const allIpoItems = (ipos || [])
    .slice(0, 15)
    .map(ipo => ({
      name: ipo.symbol || ipo.companyName.split(' ')[0].toUpperCase().slice(0, 10),
      hasGmp: ipo.gmp !== null && ipo.gmp !== undefined,
      gmp: ipo.gmp || 0, // Show raw GMP value in Rs
      isPositive: (ipo.gmp || 0) >= 0
    }));

  if (allIpoItems.length === 0) {
    return (
      <div className="bg-[#1a1a1a] overflow-hidden py-2.5">
        <div className="flex items-center justify-center text-gray-400 text-sm py-1">
          Loading IPO data...
        </div>
      </div>
    );
  }

  const displayItems = tickerItems.length > 0 ? tickerItems : allIpoItems;
  
  return (
    <div className="bg-[#1a1a1a] overflow-hidden py-2.5">
      <div className="flex ticker-scroll">
        {[...displayItems, ...displayItems, ...displayItems].map((item, i) => (
          <TickerItem key={i} name={item.name} gmp={item.gmp} isPositive={item.isPositive} />
        ))}
      </div>
    </div>
  );
}

function NavHeader() {
  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
                <div className="bg-primary p-1.5 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg text-foreground">IPO Analyzer</span>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard">
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-sm font-medium" data-testid="link-nav-dashboard">Dashboard</span>
              </Link>
              <Link href="/watchlist">
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-sm font-medium" data-testid="link-nav-watchlist">Watchlist</span>
              </Link>
              <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-sm font-medium">Documentation</span>
              <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-sm font-medium">FAQs</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button className="bg-primary text-white hover:bg-primary/90 font-semibold rounded-full px-6" data-testid="button-signup">
                Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusTabs({ activeStatus, onStatusChange }: { activeStatus: string; onStatusChange: (s: string) => void }) {
  const statuses = [
    { value: 'open', label: 'Open' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'announced', label: 'Announced' },
    { value: 'closed', label: 'Closed' },
  ];
  
  return (
    <div className="flex items-center gap-2">
      {statuses.map(s => (
        <button
          key={s.value}
          onClick={() => onStatusChange(s.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeStatus === s.value 
              ? 'bg-foreground text-background' 
              : 'bg-transparent text-muted-foreground border border-border hover:bg-muted'
          }`}
          data-testid={`tab-status-${s.value}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function formatIpoForJson(ipo: Ipo) {
  return {
    id: String(ipo.id),
    source: "bse",
    bseInfoUrl: `https://www.bseindia.com/markets/publicIssues/ACQDisp.aspx?id=${ipo.id}`,
    status: ipo.status,
    slug: ipo.symbol?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknown',
    name: ipo.companyName,
    symbol: ipo.symbol || "N/A",
    type: "EQ",
    startDate: ipo.expectedDate || "TBA",
    endDate: ipo.expectedDate || "TBA",
    priceRange: ipo.priceRange,
    schedule: [],
    gmp: ipo.gmp,
    overallScore: ipo.overallScore,
  };
}

function ApiPreviewSection({ activeStatus, ipos }: { activeStatus: string; ipos: Ipo[] | undefined }) {
  const [copied, setCopied] = useState(false);
  
  const apiUrl = `https://api.ipoanalyzer.in/ipos?status=${activeStatus}`;
  
  const jsonData = {
    meta: {
      count: ipos?.length || 0,
      countOnPage: ipos?.slice(0, 3).length || 0,
      totalPages: 1,
      page: 1,
      limit: 10,
      info: "IPO Analyzer API - Real-time IPO data for the Indian market"
    },
    ipos: ipos?.slice(0, 2).map(formatIpoForJson) || []
  };
  
  const jsonString = JSON.stringify(jsonData, null, 2);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-[#282c34] rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#21252b] border-b border-[#181a1f]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
        </div>
        <div className="flex-1 bg-[#1e2127] rounded-md px-3 py-1.5 text-sm flex items-center gap-2 ml-2">
          <Shield className="w-4 h-4 text-[#27c93f]" />
          <span className="text-[#98c379] font-mono text-xs">{apiUrl}</span>
          <button onClick={handleCopy} className="ml-auto text-gray-500 hover:text-white transition-colors" data-testid="button-copy-api-url">
            <Copy className="w-4 h-4" />
          </button>
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      
      <div className="p-6 max-h-[420px] overflow-auto font-mono text-sm leading-6 text-left">
        <pre className="text-white whitespace-pre">
{`{
  `}<span className="text-[#c678dd]">"meta"</span>{`: {
    `}<span className="text-[#c678dd]">"count"</span>{`: `}<span className="text-[#d19a66]">{jsonData.meta.count}</span>{`,
    `}<span className="text-[#c678dd]">"countOnPage"</span>{`: `}<span className="text-[#d19a66]">{jsonData.meta.countOnPage}</span>{`,
    `}<span className="text-[#c678dd]">"totalPages"</span>{`: `}<span className="text-[#d19a66]">1</span>{`,
    `}<span className="text-[#c678dd]">"page"</span>{`: `}<span className="text-[#d19a66]">1</span>{`,
    `}<span className="text-[#c678dd]">"limit"</span>{`: `}<span className="text-[#d19a66]">1</span>{`,
    `}<span className="text-[#c678dd]">"info"</span>{`: `}<span className="text-[#98c379]">"To get all IPOs, please provide a valid API key. Contact support for more information."</span>{`
  },
  `}<span className="text-[#c678dd]">"ipos"</span>{`: [`}
{jsonData.ipos.map((ipo, idx) => (
<span key={idx}>{`
    {
      `}<span className="text-[#c678dd]">"id"</span>{`: `}<span className="text-[#98c379]">"{ipo.id}"</span>{`,
      `}<span className="text-[#c678dd]">"source"</span>{`: `}<span className="text-[#98c379]">"bse"</span>{`,
      `}<span className="text-[#c678dd]">"bseInfoUrl"</span>{`: `}<span className="text-[#98c379]">"{ipo.bseInfoUrl.slice(0, 50)}..."</span>{`,
      `}<span className="text-[#c678dd]">"status"</span>{`: `}<span className="text-[#98c379]">"{ipo.status}"</span>{`,
      `}<span className="text-[#c678dd]">"slug"</span>{`: `}<span className="text-[#98c379]">"{ipo.slug}"</span>{`,
      `}<span className="text-[#c678dd]">"name"</span>{`: `}<span className="text-[#98c379]">"{ipo.name}"</span>{`,
      `}<span className="text-[#c678dd]">"symbol"</span>{`: `}<span className="text-[#98c379]">"{ipo.symbol}"</span>{`,
      `}<span className="text-[#c678dd]">"type"</span>{`: `}<span className="text-[#98c379]">"EQ"</span>{`,
      `}<span className="text-[#c678dd]">"startDate"</span>{`: `}<span className="text-[#98c379]">"{ipo.startDate}"</span>{`,
      `}<span className="text-[#c678dd]">"endDate"</span>{`: `}<span className="text-[#98c379]">"{ipo.endDate}"</span>{`,
      `}<span className="text-[#c678dd]">"priceRange"</span>{`: `}<span className="text-[#98c379]">"{ipo.priceRange}"</span>{`
    }`}{idx < jsonData.ipos.length - 1 ? ',' : ''}</span>
))}
{jsonData.ipos.length === 0 && <span className="text-gray-500">{`
    // No ${activeStatus} IPOs currently available`}</span>}
{`
  ]
}`}
        </pre>
      </div>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "What is IPO Analyzer?",
      answer: "IPO Analyzer is a smart screening tool for Initial Public Offerings (IPOs) in the Indian stock market. It provides AI-powered analysis, risk scoring, and red flag detection to help you make informed decisions about IPO investments."
    },
    {
      question: "Do you have a free tier?",
      answer: "Yes! You can get started for free with access to basic IPO data, scores, and analysis. Premium features like real-time alerts and advanced analytics are available with upgraded plans."
    },
    {
      question: "What are the data sources?",
      answer: "We aggregate data from publicly accessible sources including NSE, BSE, and other financial data providers. Our AI then analyzes this data to compute scores and identify potential red flags."
    },
    {
      question: "Do you provide Grey Market Premium (GMP) data?",
      answer: "Yes, we track and display GMP data for active IPOs. The GMP is shown as a percentage in the ticker bar and on individual IPO cards to help you gauge market sentiment."
    },
    {
      question: "How frequently is the data updated?",
      answer: "IPO data is updated multiple times daily. GMP data and market sentiment indicators are refreshed regularly to provide you with near real-time information."
    },
    {
      question: "Is there a limit on the number of requests I can make?",
      answer: "Free tier users have reasonable usage limits. For higher volume access and API integration, please check our premium plans."
    },
    {
      question: "Can I request a feature or report a bug?",
      answer: "Absolutely! We welcome feedback from our users. You can contact us through the settings page or reach out via email. We actively work on improving the platform based on user suggestions."
    }
  ];
  
  return (
    <section className="py-20 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground text-center mb-12">
          Read the list below for our frequently asked questions. If your question is not listed here,
          then don't hesitate to contact us. We'd love to hear from you!
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-b border-border">
              <AccordionTrigger className="text-left font-medium py-4 hover:no-underline" data-testid={`faq-item-${i}`}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default function Landing() {
  const [activeStatus, setActiveStatus] = useState('open');
  const { data: ipos, isLoading } = useIpos({ status: activeStatus as "open" | "upcoming" | "closed" | undefined });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollingTicker />
      <NavHeader />
      
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-8 cursor-pointer hover:bg-muted/80 transition-colors">
          <span>How did a weekend experiment turn into a powerful screener?</span>
          <span className="text-primary font-semibold flex items-center gap-1">
            Read the story <ArrowRight className="w-3 h-3" />
          </span>
        </div>
        
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
          The near <span className="text-primary">real-time API</span> for
          <br />
          IPOs in India
        </h1>
        
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
          Get the most comprehensive and aggregated data from publicly accessible
          sources. With our near real-time API and analysis, you can screen IPO
          data in your applications in less than 2 minutes.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/dashboard">
            <Button 
              size="lg" 
              className="h-12 px-8 text-base font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90"
              data-testid="button-hero-start"
            >
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button 
              size="lg" 
              variant="outline"
              className="h-12 px-8 text-base font-semibold rounded-lg border-border"
              data-testid="button-hero-demo"
            >
              View Documentation
            </Button>
          </Link>
        </div>

        <div className="flex justify-center mb-8">
          <StatusTabs activeStatus={activeStatus} onStatusChange={setActiveStatus} />
        </div>

        <ApiPreviewSection activeStatus={activeStatus} ipos={ipos} />
      </section>

      <section className="py-16 bg-muted">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">Why use IPO Analyzer?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: BarChart3, 
                title: "Smart Scoring", 
                desc: "Fundamentals, valuation, and governance scores computed from DRHP data."
              },
              { 
                icon: Shield, 
                title: "Risk Detection", 
                desc: "Automated red flag identification for high OFS, expensive valuations, and more."
              },
              { 
                icon: Zap, 
                title: "Real-time Alerts", 
                desc: "Get notified via email or Telegram when new IPOs are announced or GMP changes."
              }
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection />

      <section className="py-16 bg-muted">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground mb-4">P.S. You can also ask for help or request for features.</p>
          <Link href="/dashboard">
            <Button className="bg-primary text-white hover:bg-primary/90 font-semibold rounded-lg px-8" data-testid="button-cta-signup">
              Start Analyzing IPOs
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
