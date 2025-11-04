import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, UserCheck, Shield } from "lucide-react";

interface LoginPageProps {
  onLogin?: (role: string, email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  const handleLogin = (role: string) => {
    console.log('Login attempted:', { role, email });
    onLogin?.(role, email);
    
    // Navigate to the appropriate dashboard
    if (role === "institution") {
      setLocation("/dashboard");
    } else if (role === "evaluator") {
      setLocation("/evaluator/dashboard");
    } else if (role === "admin") {
      setLocation("/admin/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight mb-2">AICTE Setu</h1>
          <p className="text-muted-foreground">
            Digital Approval Platform for Technical Education
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Choose your role and enter your credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="institution" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="institution" data-testid="tab-institution">
                  <Building2 className="w-4 h-4 mr-2" />
                  Institution
                </TabsTrigger>
                <TabsTrigger value="evaluator" data-testid="tab-evaluator">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Evaluator
                </TabsTrigger>
                <TabsTrigger value="admin" data-testid="tab-admin">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {["institution", "evaluator", "admin"].map(role => (
                <TabsContent key={role} value={role} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`email-${role}`}>Email</Label>
                    <Input
                      id={`email-${role}`}
                      type="email"
                      placeholder={`${role}@example.com`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`password-${role}`}>Password</Label>
                    <Input
                      id={`password-${role}`}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleLogin(role)}
                    data-testid="button-login"
                  >
                    Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                  <div className="text-center">
                    <button className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                      Forgot password?
                    </button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? Contact{" "}
          <a href="mailto:support@aictesetu.gov.in" className="text-primary hover:underline">
            support@aictesetu.gov.in
          </a>
        </p>
      </div>
    </div>
  );
}
