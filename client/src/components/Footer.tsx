import { TrendingUp } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary p-1.5 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">IPO Analyzer</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              A screening tool that provides analysis of Initial Public
              Offerings (IPOs) in India from publicly accessible sources.
            </p>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              All services are online
            </div>
            <p className="text-muted-foreground text-xs mt-4">
              Made in India.
              <br />
              Copyright 2026 IPO Analyzer | All rights reserved.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/dashboard">
                  <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Dashboard</span>
                </Link>
              </li>
              <li>
                <Link href="/watchlist">
                  <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Watchlist</span>
                </Link>
              </li>
              <li>
                <Link href="/settings">
                  <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Settings</span>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Contact Us</span>
              </li>
              <li>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Terms of Service</span>
              </li>
              <li>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
              </li>
              <li>
                <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Disclaimer</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> IPO Analyzer is not a registered broker, investment adviser, or financial adviser. The content and data provided through this website is aggregated from publicly accessible sources (including, but not limited to, NSE) and are intended solely for general informational purposes. IPO Analyzer does not claim ownership of this data, nor does it guarantee its accuracy, completeness, or timeliness. IPO Analyzer is not affiliated with NSE, BSE, SEBI, or any other source from which data may be obtained. The information provided must not be used for real-time trading, automated decision-making, or investment analysis. Users are strongly advised to verify all information with official sources before making any investment or financial decisions. For more information, refer to our Disclaimer.
          </p>
        </div>
      </div>
    </footer>
  );
}
