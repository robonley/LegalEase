import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Scale, Users, FileText, Shield, Clock, Building, Award } from "lucide-react";

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 49,
    description: 'Perfect for solo practitioners and small legal teams',
    features: [
      'Up to 5 legal entities',
      '10 document templates',
      'Basic cap table management',
      'Email support',
      'Audit logging'
    ],
    popular: false
  },
  {
    name: 'Professional',
    price: 149,
    description: 'Ideal for growing law firms with multiple clients',
    features: [
      'Up to 25 legal entities',
      '50 document templates',
      'Advanced cap table features',
      'Minute book generation',
      'Priority support',
      'Custom branding'
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 349,
    description: 'For large firms requiring unlimited capacity',
    features: [
      'Unlimited legal entities',
      'Custom document templates',
      'Advanced reporting & analytics',
      'API access',
      'Dedicated account manager',
      'White-label solution'
    ],
    popular: false
  }
];

const FEATURES = [
  {
    icon: Building,
    title: 'Entity Management',
    description: 'Comprehensive tracking of corporations, partnerships, and other legal entities with full organizational details.'
  },
  {
    icon: Users,
    title: 'People & Roles',
    description: 'Manage directors, officers, and shareholders with detailed role assignments and historical tracking.'
  },
  {
    icon: FileText,
    title: 'Document Generation',
    description: 'Create professional legal documents from customizable templates with automated data population.'
  },
  {
    icon: Scale,
    title: 'Cap Table Management',
    description: 'Track share classes, issuances, and transfers with full audit trails and compliance reporting.'
  },
  {
    icon: Shield,
    title: 'Compliance & Audit',
    description: 'Maintain complete audit logs and ensure regulatory compliance with automated tracking.'
  },
  {
    icon: Clock,
    title: 'Minute Book Creation',
    description: 'Generate complete corporate minute books with all required documents and proper formatting.'
  }
];

const TESTIMONIALS = [
  {
    quote: "LegalEntity has transformed how we manage our corporate clients. The minute book generation alone saves us 10+ hours per client.",
    author: "Sarah Chen",
    title: "Partner, Corporate Law",
    company: "Chen & Associates"
  },
  {
    quote: "The cap table management features are exceptional. We can track complex ownership structures with ease.",
    author: "Michael Rodriguez",
    title: "Senior Associate",
    company: "Rodriguez Legal Group"
  },
  {
    quote: "Finally, a platform built specifically for legal professionals. The compliance features give us complete confidence.",
    author: "Jennifer Park",
    title: "Managing Partner",
    company: "Park Law Corporation"
  }
];

export default function Landing() {
  const handleGetStarted = () => {
    window.location.href = '/api/login';
  };

  const handleContactSales = () => {
    // This could link to a contact form or calendar booking
    window.location.href = 'mailto:sales@legalentity.com';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">LegalEntity</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleGetStarted} data-testid="nav-signin">
              Sign In
            </Button>
            <Button onClick={handleContactSales} data-testid="nav-contact">
              Contact Sales
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto max-w-4xl">
          <Badge className="mb-6" variant="secondary">
            Trusted by 500+ Law Firms
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            The Complete
            <span className="text-primary"> Legal Entity</span>
            <br />Management Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline corporate governance, generate minute books, and manage cap tables 
            with the platform built specifically for legal professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} data-testid="hero-get-started">
              <Award className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={handleContactSales} data-testid="hero-demo">
              <Users className="mr-2 h-5 w-5" />
              Schedule Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Corporate Law Practice
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Purpose-built features that save time, ensure compliance, and elevate your practice.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Legal Professionals
            </h2>
            <p className="text-xl text-muted-foreground">
              See what lawyers are saying about LegalEntity
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="h-full">
                <CardContent className="pt-6">
                  <blockquote className="text-lg mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.title}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your practice. All plans include core features and dedicated support.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <Card key={index} className={`h-full relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1 mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="mt-4">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleGetStarted}
                    data-testid={`pricing-${plan.name.toLowerCase()}`}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Need a custom solution for your firm?
            </p>
            <Button variant="outline" onClick={handleContactSales} data-testid="pricing-contact">
              Contact Our Sales Team
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of legal professionals who trust LegalEntity for their corporate governance needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handleGetStarted}
              data-testid="cta-start-trial"
            >
              Start Your Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={handleContactSales}
              data-testid="cta-schedule-demo"
            >
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Scale className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">LegalEntity</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The complete legal entity management platform for modern law firms.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
                <li>Integrations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Documentation</li>
                <li>API Reference</li>
                <li>Status</li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2024 LegalEntity. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
