import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";

interface MobileNavProps {
  onGetStarted: () => void;
  onContactSales: () => void;
}

export function MobileNav({ onGetStarted, onContactSales }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      handleClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          data-testid="mobile-menu-trigger"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <nav className="flex flex-col space-y-4 mt-8">
          <button
            onClick={() => scrollToSection('features')}
            className="text-left text-lg font-medium hover:text-primary transition-colors"
            data-testid="mobile-nav-features"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('testimonials')}
            className="text-left text-lg font-medium hover:text-primary transition-colors"
            data-testid="mobile-nav-testimonials"
          >
            Testimonials
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="text-left text-lg font-medium hover:text-primary transition-colors"
            data-testid="mobile-nav-pricing"
          >
            Pricing
          </button>
          <div className="pt-4 border-t">
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-lg"
                onClick={() => {
                  onGetStarted();
                  handleClose();
                }}
                data-testid="mobile-nav-signin"
              >
                Sign In
              </Button>
              <Button 
                className="w-full text-lg"
                onClick={() => {
                  onGetStarted();
                  handleClose();
                }}
                data-testid="mobile-nav-trial"
              >
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-lg"
                onClick={() => {
                  onContactSales();
                  handleClose();
                }}
                data-testid="mobile-nav-demo"
              >
                Schedule Demo
              </Button>
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}