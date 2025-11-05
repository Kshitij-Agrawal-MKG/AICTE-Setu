import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Users, TrendingUp, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.getAdminDashboard(),
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/alerts", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
  });

  const stats = [
    { title: "Total Applications", value: String(data?.stats.totalApplications || 0), icon: FileText },
    { title: "Active Evaluators", value: String(data?.stats.activeEvaluators || 0), icon: Users },
    { title: "Approval Rate", value: `${data?.stats.approvalRate || 0}%`, icon: TrendingUp },
    { title: "Avg. Processing Time", value: data?.stats.avgProcessingTime || "0 days", icon: Clock },
  ];

  const chartData = data?.chartData || [];

  interface WorkflowStage {
    stage: string;
    count: number;
  }

  const workflowStages = (data?.workflowStages || []).map((w: WorkflowStage, i: number) => ({
    stage: w.stage,
    count: w.count,
    color: ["bg-blue-500", "bg-yellow-500", "bg-purple-500", "bg-orange-500", "bg-green-500"][i % 5]
  }));

  interface Alert {
    type: string;
    message: string;
    action: string;
    actionUrl: string;
  }

  const alerts = (alertsData?.alerts || []).map((alert: Alert, i: number) => ({
    id: i + 1,
    type: alert.type,
    message: alert.message,
    icon: alert.type === "warning" ? AlertTriangle : CheckCircle,
    action: alert.action,
    actionUrl: alert.actionUrl,
  }));

  if (isLoading || alertsLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div>
        <h1 className="text-4xl font-medium tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage the AICTE approval process
        </p>
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
                <Icon className="w-4 h-4 text-primary" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applications" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflowStages.map((item: { stage: string; count: number; color: string }) => {
              const totalApps = workflowStages.reduce((sum: number, stage: { count: number }) => sum + stage.count, 0);
              const percentage = totalApps > 0 ? (item.count / totalApps) * 100 : 0;
              return (
                <div key={item.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.stage}</span>
                    <span className="text-sm text-muted-foreground">{item.count} applications</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>System Alerts</CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No alerts at this time</p>
          ) : (
            alerts.map((alert: { id: number; type: string; message: string; icon: any; action: string; actionUrl: string }) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
                  data-testid={`alert-${alert.id}`}
                >
                  <Icon className={`w-5 h-5 ${alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`} />
                  <p className="text-sm flex-1">{alert.message}</p>
                  <Link href={alert.actionUrl}>
                    <Button variant="ghost" size="sm" data-testid={`button-alert-${alert.id}`}>
                      {alert.action}
                    </Button>
                  </Link>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
