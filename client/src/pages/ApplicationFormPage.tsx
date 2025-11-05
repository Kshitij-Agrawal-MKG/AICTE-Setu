import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DocumentUploadZone from "@/components/DocumentUploadZone";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ApplicationFormPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    applicationType: "",
    institutionName: "",
    address: "",
    state: "",
    courseName: "",
    intake: "",
    description: ""
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const saveApplicationMutation = useMutation({
    mutationFn: async () => {
      const data = {
        applicationType: formData.applicationType,
        institutionName: formData.institutionName || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        courseName: formData.courseName || undefined,
        intake: formData.intake ? parseInt(formData.intake) : undefined,
        description: formData.description || undefined,
      };
      
      if (applicationId) {
        const response = await apiRequest("PUT", `/api/applications/${applicationId}`, data);
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/applications", data);
        return await response.json();
      }
    },
    onSuccess: (data) => {
      if (!applicationId) {
        setApplicationId(data.application.applicationNumber);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/institution/applications"] });
      queryClient.invalidateQueries({ queryKey: ["institution-dashboard"] });
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (appId: string) => {
      return await apiRequest("POST", `/api/applications/${appId}/submit`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/institution/applications"] });
      queryClient.invalidateQueries({ queryKey: ["institution-dashboard"] });
      setLocation("/applications");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = async () => {
    if (!formData.applicationType) {
      toast({
        title: "Error",
        description: "Please select an application type before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveApplicationMutation.mutateAsync();
      toast({
        title: "Success",
        description: applicationId ? "Draft updated successfully!" : "Draft saved successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.applicationType || !formData.courseName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      let appId = applicationId;
      if (!appId) {
        const result = await saveApplicationMutation.mutateAsync();
        appId = result.application.applicationNumber;
      }
      
      if (appId) {
        await submitApplicationMutation.mutateAsync(appId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="application-form">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/applications")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-medium tracking-tight mb-2">New Application</h1>
          <p className="text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSaveDraft}
          disabled={saveApplicationMutation.isPending}
          data-testid="button-save-draft"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveApplicationMutation.isPending ? "Saving..." : "Save Draft"}
        </Button>
      </div>

      <Progress value={progress} className="h-2" />

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Application Type & Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="application-type">Application Type *</Label>
              <Select
                value={formData.applicationType}
                onValueChange={(value) => setFormData({ ...formData, applicationType: value })}
              >
                <SelectTrigger id="application-type" data-testid="select-application-type">
                  <SelectValue placeholder="Select application type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new-institution">New Institution Approval</SelectItem>
                  <SelectItem value="intake-increase">Increase in Intake</SelectItem>
                  <SelectItem value="new-course">New Course Addition</SelectItem>
                  <SelectItem value="eoa">Extension of Approval (EoA)</SelectItem>
                  <SelectItem value="location-change">Location Change</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="institution-name">Institution Name *</Label>
                <Input
                  id="institution-name"
                  value={formData.institutionName}
                  onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                  placeholder="Enter institution name"
                  data-testid="input-institution-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger id="state" data-testid="select-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maharashtra">Maharashtra</SelectItem>
                    <SelectItem value="tamil-nadu">Tamil Nadu</SelectItem>
                    <SelectItem value="karnataka">Karnataka</SelectItem>
                    <SelectItem value="delhi">Delhi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Complete Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter complete address"
                rows={3}
                data-testid="input-address"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="course-name">Course Name *</Label>
              <Input
                id="course-name"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="e.g., B.Tech in Computer Science"
                data-testid="input-course-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake">Proposed Intake *</Label>
              <Input
                id="intake"
                type="number"
                value={formData.intake}
                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                placeholder="e.g., 120"
                data-testid="input-intake"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about the course curriculum, objectives, etc."
                rows={4}
                data-testid="input-description"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <DocumentUploadZone category="Affidavit & Trust Deed" />
            <DocumentUploadZone category="Land Documents" />
            <DocumentUploadZone category="Building Plan & NOC" />
            <DocumentUploadZone category="Infrastructure Photos" acceptedFormats="JPEG, PNG" />
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="font-medium text-lg">Application Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Application Type</p>
                  <p className="font-medium">{formData.applicationType || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Institution Name</p>
                  <p className="font-medium">{formData.institutionName || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">State</p>
                  <p className="font-medium">{formData.state || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Course Name</p>
                  <p className="font-medium">{formData.courseName || "Not specified"}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Declaration</p>
              <p className="text-muted-foreground">
                I hereby declare that all information provided is true and accurate to the best of my knowledge.
                I understand that any false information may lead to rejection of the application.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          data-testid="button-previous"
        >
          Previous
        </Button>
        
        {currentStep < totalSteps ? (
          <Button
            onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
            data-testid="button-next"
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={submitApplicationMutation.isPending || saveApplicationMutation.isPending}
            data-testid="button-submit"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
          </Button>
        )}
      </div>
    </div>
  );
}
