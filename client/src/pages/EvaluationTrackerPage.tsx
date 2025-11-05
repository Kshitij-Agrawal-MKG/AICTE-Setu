import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, FileText, TrendingUp } from "lucide-react";
import type { Application, Document } from "@shared/schema";

interface ApplicationWithDetails extends Application {
  documents: Document[];
  evaluationProgress: number;
  approvedDocs: number;
  rejectedDocs: number;
  pendingDocs: number;
}

export default function EvaluationTrackerPage() {
  const { data: applications, isLoading } = useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications/tracker"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Evaluation Tracker</h1>
          <p className="text-muted-foreground mt-2">Track document approval status and application progress</p>
        </div>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  const totalApplications = applications?.length || 0;
  const totalDocuments = applications?.reduce((acc, app) => acc + app.documents.length, 0) || 0;
  const approvedDocuments = applications?.reduce((acc, app) => acc + app.approvedDocs, 0) || 0;
  const rejectedDocuments = applications?.reduce((acc, app) => acc + app.rejectedDocs, 0) || 0;
  const pendingDocuments = applications?.reduce((acc, app) => acc + app.pendingDocs, 0) || 0;
  const overallProgress = totalDocuments > 0 ? Math.round(((approvedDocuments + rejectedDocuments) / totalDocuments) * 100) : 0;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
      approved: { label: "Approved", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      pending: { label: "Pending", variant: "secondary" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getDocumentIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Evaluation Tracker</h1>
        <p className="text-muted-foreground mt-2">Track document approval status and application progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-applications">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-applications">{totalApplications}</div>
            <p className="text-xs text-muted-foreground">Being tracked</p>
          </CardContent>
        </Card>

        <Card data-testid="card-approved-documents">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Documents</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved-documents">{approvedDocuments}</div>
            <p className="text-xs text-muted-foreground">Out of {totalDocuments} total</p>
          </CardContent>
        </Card>

        <Card data-testid="card-rejected-documents">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Documents</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-rejected-documents">{rejectedDocuments}</div>
            <p className="text-xs text-muted-foreground">Need resubmission</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-documents">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-overall-progress">{overallProgress}%</div>
            <Progress value={overallProgress} className="mt-2" data-testid="progress-overall" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all">All Applications</TabsTrigger>
          <TabsTrigger value="in-progress" data-testid="tab-in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {applications?.map((app) => (
            <Card key={app.id} data-testid={`card-application-${app.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-app-number-${app.id}`}>
                      {app.applicationNumber}
                    </CardTitle>
                    <CardDescription data-testid={`text-app-name-${app.id}`}>
                      {app.institutionName}
                      {app.courseName && ` - ${app.courseName}`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" data-testid={`badge-app-status-${app.id}`}>
                    {app.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Evaluation Progress</span>
                    <span className="text-sm text-muted-foreground" data-testid={`text-progress-${app.id}`}>
                      {app.evaluationProgress}%
                    </span>
                  </div>
                  <Progress value={app.evaluationProgress} data-testid={`progress-${app.id}`} />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-2xl font-bold text-green-600" data-testid={`text-approved-${app.id}`}>
                        {app.approvedDocs}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-2xl font-bold text-red-600" data-testid={`text-rejected-${app.id}`}>
                        {app.rejectedDocs}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span className="text-2xl font-bold text-yellow-600" data-testid={`text-pending-${app.id}`}>
                        {app.pendingDocs}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Document Status</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {app.documents.map((doc) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDocumentIcon(doc.status)}
                              <span data-testid={`text-doc-name-${doc.id}`}>{doc.category}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell className="text-muted-foreground" data-testid={`text-doc-size-${doc.id}`}>
                            {doc.fileSize}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {applications?.filter(app => app.evaluationProgress < 100).map((app) => (
            <Card key={app.id} data-testid={`card-application-${app.id}`}>
              <CardHeader>
                <CardTitle className="text-lg">{app.applicationNumber}</CardTitle>
                <CardDescription>{app.institutionName}</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={app.evaluationProgress} />
                <p className="text-sm text-muted-foreground mt-2">
                  {app.pendingDocs} documents pending review
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {applications?.filter(app => app.evaluationProgress === 100).map((app) => (
            <Card key={app.id} data-testid={`card-application-${app.id}`}>
              <CardHeader>
                <CardTitle className="text-lg">{app.applicationNumber}</CardTitle>
                <CardDescription>{app.institutionName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-600">All documents evaluated</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
