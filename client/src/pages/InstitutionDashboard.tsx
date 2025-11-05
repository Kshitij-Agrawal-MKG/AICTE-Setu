import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ApplicationCard from "@/components/ApplicationCard";
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

export default function InstitutionDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery({
    queryKey: ["institution-dashboard"],
    queryFn: () => api.getInstitutionDashboard(),
  });

  const stats = [
    { title: "Total Applications", value: String(data?.stats.total || 0), icon: FileText, color: "text-blue-600" },
    { title: "In Progress", value: String(data?.stats.inProgress || 0), icon: Clock, color: "text-yellow-600" },
    { title: "Approved", value: String(data?.stats.approved || 0), icon: CheckCircle, color: "text-green-600" },
    { title: "Rejected", value: String(data?.stats.rejected || 0), icon: XCircle, color: "text-red-600" },
  ];

  const applications = data?.applications || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6" data-testid="institution-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-medium tracking-tight mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Manage your AICTE approval applications
          </p>
        </div>
        <Button size="lg" onClick={() => setLocation("/new-application")} data-testid="button-new-application">
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-2xl font-medium mb-4">Recent Applications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app: any) => (
            <ApplicationCard
              key={app.id}
              {...app}
              onViewDetails={() => console.log('View details:', app.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
