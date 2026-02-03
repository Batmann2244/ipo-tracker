import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#030303]">
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">404</h1>
        <p className="text-white/40 mb-8 max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button 
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white border-0"
            data-testid="button-go-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
