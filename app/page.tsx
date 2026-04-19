import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Rocket,
} from "lucide-react";
import Link from "next/link";

// add some comment here so vercel will update. Hurray and Hahaha

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <Rocket className="size-5" />
              </div>
              <h1 className="text-2xl font-bold">Ordo</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              E-Commerce CRM & Order Management
            </div>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Streamline Your E-Commerce
            <br />
            <span className="text-primary">Operations</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive order management, inventory tracking, and sales
            analytics all in one powerful platform. Built for growing
            businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Start Managing Orders
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/order-form">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Place an Order
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-12">
          <h3 className="text-3xl md:text-4xl font-bold">
            Everything You Need to Succeed
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to help you manage your business
            efficiently
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Feature Cards */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Order Management</h4>
              <p className="text-muted-foreground">
                Track orders from creation to delivery with automated status
                updates and real-time notifications.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Inventory Control</h4>
              <p className="text-muted-foreground">
                Monitor stock levels, track product movement, and manage
                inventory across multiple locations.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Sales Team Management</h4>
              <p className="text-muted-foreground">
                Round-robin order assignment, performance tracking, and detailed
                analytics for your sales representatives.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Agent Distribution</h4>
              <p className="text-muted-foreground">
                Manage delivery agents, assign stock, reconcile inventory, and
                track agent performance metrics.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Analytics & Insights</h4>
              <p className="text-muted-foreground">
                Comprehensive dashboards with revenue tracking, profit analysis,
                and performance comparisons.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Financial Management</h4>
              <p className="text-muted-foreground">
                Track expenses, calculate profit margins, and manage product
                costs with multi-currency support.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold">
                    Built for Modern E-Commerce
                  </h3>
                  <p className="text-muted-foreground">
                    Ordo provides everything you need to manage orders,
                    inventory, and sales operations efficiently in one
                    integrated platform.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        Role-based access control for team collaboration
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Real-time order tracking and status updates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Automated round-robin order assignment</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Comprehensive reporting and analytics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Multi-currency support for global operations</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
                    <div className="text-4xl font-bold text-primary mb-2">
                      3
                    </div>
                    <div className="font-semibold mb-1">User Roles</div>
                    <div className="text-sm text-muted-foreground">
                      Admin, Sales Rep, and Inventory Manager access levels
                    </div>
                  </div>

                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
                    <div className="text-4xl font-bold text-primary mb-2">
                      ∞
                    </div>
                    <div className="font-semibold mb-1">Scalable</div>
                    <div className="text-sm text-muted-foreground">
                      Handle unlimited products, orders, and team members
                    </div>
                  </div>

                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
                    <div className="text-4xl font-bold text-primary mb-2">
                      24/7
                    </div>
                    <div className="font-semibold mb-1">Always Available</div>
                    <div className="text-sm text-muted-foreground">
                      Cloud-based platform accessible anytime, anywhere
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h3 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your Business?
          </h3>
          <p className="text-xl text-muted-foreground">
            Join businesses using Ordo to streamline their operations and grow
            faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <Rocket className="size-5" />
              </div>
              <span className="font-semibold">Ordo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Ordo. E-Commerce CRM & Order
              Management System.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
