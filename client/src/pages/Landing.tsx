import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/ui/mobile-nav";
import { CheckCircle, Scale, Users, FileText, Shield, Clock, Building, Award, ArrowRight, Play, TrendingUp, Zap, Star } from "lucide-react";

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
    description: 'Track unlimited corporations, partnerships, and LLCs with automated compliance monitoring.',
    metric: '500+ entities managed',
    benefit: 'Save 15+ hours per month'
  },
  {
    icon: FileText,
    title: 'Document Generation',
    description: 'Generate bylaws, resolutions, and minute books instantly from law-firm-tested templates.',
    metric: '50,000+ documents created',
    benefit: 'Reduce drafting time by 80%'
  },
  {
    icon: Scale,
    title: 'Cap Table Management',
    description: 'Model complex ownership structures with real-time valuation tracking and investor reporting.',
    metric: '$50B+ in equity tracked',
    benefit: 'Eliminate spreadsheet errors'
  },
  {
    icon: Shield,
    title: 'Compliance Automation',
    description: 'Never miss a filing deadline with automated alerts and pre-filled regulatory forms.',
    metric: '99.9% compliance rate',
    benefit: 'Prevent costly penalties'
  },
  {
    icon: Users,
    title: 'Client Portal',
    description: 'Give clients secure access to their corporate data with role-based permissions.',
    metric: '95% client satisfaction',
    benefit: 'Reduce support requests'
  },
  {
    icon: Zap,
    title: 'API Integration',
    description: 'Connect with existing practice management and accounting systems seamlessly.',
    metric: '20+ integrations',
    benefit: 'Streamline workflows'
  }
];

const TESTIMONIALS = [
  {
    quote: "LegalEntity has transformed how we manage our corporate clients. The minute book generation alone saves us 10+ hours per client.",
    author: "Sarah Chen",
    title: "Partner, Corporate Law",
    company: "Chen & Associates",
    rating: 5,
    clientSize: "15-attorney firm",
    timeSaved: "40 hours/month"
  },
  {
    quote: "We've eliminated all spreadsheet errors in our cap table management. The automated compliance alerts are game-changing.",
    author: "Michael Rodriguez",
    title: "Senior Associate",
    company: "Rodriguez Legal Group",
    rating: 5,
    clientSize: "50+ corporate clients",
    timeSaved: "25 hours/month"
  },
  {
    quote: "ROI was immediate. We recovered our annual investment within the first two months from time savings alone.",
    author: "Jennifer Park",
    title: "Managing Partner",
    company: "Park Law Corporation",
    rating: 5,
    clientSize: "200+ entities managed",
    timeSaved: "60 hours/month"
  }
];

export default function Landing() {
  const handleStartTrial = () => {
    // Redirect to trial signup flow
    window.location.href = '/api/login?signup=trial';
  };

  const handleSignIn = () => {
    // Direct login for existing users
    window.location.href = '/api/login';
  };

  const handleScheduleDemo = () => {
    // Open Calendly or demo booking
    window.open('https://calendly.com/legalentity-demo', '_blank');
  };

  const handleContactSales = () => {
    // Scroll to contact form or open chat
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.open('https://calendly.com/legalentity-sales', '_blank');
    }
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
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="nav-features"
            >
              Features
            </button>
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="nav-pricing"
            >
              Pricing
            </button>
            <button 
              onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium hover:text-primary transition-colors"
              data-testid="nav-testimonials"
            >
              Customers
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={handleSignIn} data-testid="nav-signin">
              Sign In
            </Button>
            <Button onClick={handleStartTrial} data-testid="nav-trial">
              Start Free Trial
            </Button>
          </div>

          {/* Mobile Navigation */}
          <MobileNav 
            onGetStarted={handleStartTrial}
            onContactSales={handleContactSales}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4 text-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge className="bg-green-100 text-green-800 border-green-200" variant="secondary">
              <TrendingUp className="w-3 h-3 mr-1" />
              500+ Law Firms
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200" variant="secondary">
              <Star className="w-3 h-3 mr-1" />
              4.9/5 Rating
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-tight">
            Save <span className="text-primary">40+ Hours</span> Monthly
            <br />on Corporate Law Tasks
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Automate entity management, generate minute books instantly, and eliminate cap table errors 
            with the only platform built specifically for corporate lawyers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-8 py-6" onClick={handleStartTrial} data-testid="hero-start-trial">
              <Award className="mr-2 h-6 w-6" />
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={handleScheduleDemo} data-testid="hero-demo">
              <Play className="mr-2 h-6 w-6" />
              Watch 3-Min Demo
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Setup in under 5 minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built for Corporate Law Excellence
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every feature designed to save time, reduce errors, and increase profitability for legal professionals.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="h-full group hover:shadow-lg transition-all duration-300 border-0 bg-background">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {feature.metric}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  <div className="text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 inline-block">
                    {feature.benefit}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Button size="lg" onClick={handleStartTrial} data-testid="features-cta">
              Try All Features Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <Badge className="mb-4">Customer Success</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Leading Law Firms
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join hundreds of legal professionals who've transformed their practice with LegalEntity
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="h-full border-0 shadow-lg">
                <CardContent className="pt-8 pb-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-6 leading-relaxed font-medium">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="space-y-3">
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
                    <div className="flex justify-between text-sm bg-muted/50 rounded-lg p-3">
                      <div>
                        <div className="font-medium text-primary">{testimonial.timeSaved}</div>
                        <div className="text-muted-foreground">Time Saved</div>
                      </div>
                      <div>
                        <div className="font-medium">{testimonial.clientSize}</div>
                        <div className="text-muted-foreground">Firm Size</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Button size="lg" onClick={handleStartTrial} data-testid="testimonials-cta">
              Join These Success Stories
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ROI in Your First Month
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Average customer saves $3,200 monthly in billable time. Choose the plan that scales with your practice.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <Card key={index} className={`h-full relative border-0 shadow-lg ${plan.popular ? 'ring-2 ring-primary scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Saves ${plan.price * 4}+ monthly in billable time
                    </div>
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full text-base py-6" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleStartTrial}
                    data-testid={`pricing-${plan.name.toLowerCase()}`}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    14-day free trial • No setup fees
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-16 p-8 bg-background rounded-xl border">
            <h3 className="text-xl font-semibold mb-2">Enterprise & Custom Solutions</h3>
            <p className="text-muted-foreground mb-6">
              Need white-label solutions, custom integrations, or volume pricing? Let's talk.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" onClick={handleContactSales} data-testid="pricing-contact">
                Contact Sales Team
              </Button>
              <Button variant="outline" onClick={handleScheduleDemo} data-testid="pricing-demo">
                Schedule Demo Call
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
            Start Saving 40+ Hours Monthly
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-95 max-w-3xl mx-auto leading-relaxed">
            Join 500+ law firms who've transformed their corporate practice. 
            Average setup time: 5 minutes. Average time to ROI: 2 weeks.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-10 py-6 bg-background text-primary hover:bg-background/90"
              onClick={handleStartTrial}
              data-testid="cta-start-trial"
            >
              <Award className="mr-2 h-6 w-6" />
              Start Free Trial Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-10 py-6 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
              onClick={handleScheduleDemo}
              data-testid="cta-schedule-demo"
            >
              <Play className="mr-2 h-6 w-6" />
              Watch Demo First
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-primary-foreground/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>5-minute setup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
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
