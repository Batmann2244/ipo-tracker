import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, CreditCard } from "lucide-react";

const plans = [
  {
    name: "Pro 1000 (Monthly)",
    price: 499,
    description: "Ideal for mobile and web applications with growing user base.",
    features: [
      "Up to 1000 requests / month (Rs 0.50 / request)",
      "Unlimited API Keys",
      "No daily request cap",
      "Advanced usage analytics",
      "Advanced query params",
      "Max Limit: 3 IPOs / request",
      "Community Support"
    ]
  },
  {
    name: "Pro 2500 (Monthly)",
    price: 999,
    description: "Ideal for mobile and web applications with growing user base.",
    features: [
      "Up to 2500 requests / month (Rs 0.40 / request)",
      "Unlimited API Keys",
      "No daily request cap",
      "Advanced usage analytics",
      "Advanced query params",
      "Max Limit: 3 IPOs / request",
      "Community Support"
    ]
  },
  {
    name: "Pro 5000 (Monthly)",
    price: 1499,
    description: "Ideal for mobile and web applications with growing user base.",
    features: [
      "Up to 5000 requests / month (Rs 0.30 / request)",
      "Unlimited API Keys",
      "No daily request cap",
      "Advanced usage analytics",
      "Advanced query params",
      "Max Limit: 3 IPOs / request",
      "Community Support"
    ]
  }
];

export default function Billing() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Free</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Start for free. No credit card required.</p>
          <div className="space-y-2 mb-4">
            <p className="font-medium">Plan Features</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                1 API Key
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Up to 750 requests per month
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Request cap at 25 requests per day
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Basic usage analytics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Basic query params (only currently open ipos)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Max Limit: 1 IPO / request
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Community support
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Upgrade Your Plan
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a plan that fits your needs. One-time payment, full access till the end of your billing period.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => (
              <Card key={idx} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">Rs {plan.price.toLocaleString()}</span>
                      <p className="text-xs text-muted-foreground">excl. GST</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <ul className="space-y-2 text-sm mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
                    Upgrade to {plan.name.split(' ')[0]} {plan.name.split(' ')[1]}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CreditCard className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">No payments yet</p>
            <p className="text-sm">Your payment history will appear here once you make a purchase.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
