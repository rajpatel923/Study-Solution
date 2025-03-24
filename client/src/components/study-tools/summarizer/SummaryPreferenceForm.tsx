"use client";

import React, { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { 
  FileText, 
  BookOpen, 
  FileQuestion,  
  X, 
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface SummaryPreferencesFormProps {
  fileName?: string;
  fileSize?: string;
  filePages?: number;
  onSubmit: (preferences: SummaryPreferences) => void;
  onCancel?: () => void;
}

export interface SummaryPreferences {
  title: string;
  outputType: string; // "notes" | "flashcards" | "quiz" | "none"
  language: string;
  noteLength: string; // "in-depth" | "concise"
  structureFormat: string; // "outline" | "paragraph" | "by-page"
  pageRange: string; // "all" | "custom" | specific pages
  customPrompt: string; // Custom instructions for generation
  isPublic: boolean;
  allowPdfViewing: boolean;
  customPageRange?: string;
}

export default function SummaryPreferencesForm({
  fileName = "Document.pdf",
  fileSize = "3.2 MB",
  filePages = 32,
  onSubmit,
  onCancel
}: SummaryPreferencesFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [preferences, setPreferences] = useState<SummaryPreferences>({
    title: "",
    outputType: "notes",
    language: "English",
    noteLength: "in-depth",
    structureFormat: "outline",
    pageRange: "all",
    customPrompt: "",
    isPublic: true,
    allowPdfViewing: true,
    customPageRange: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Remove the GSAP animation here since we're handling it in the parent component
    
    // Set default title based on filename
    if (fileName) {
      setPreferences(prev => ({
        ...prev,
        title: fileName.replace(/\.[^/.]+$/, "") // Remove file extension
      }));
    }
  }, [fileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      onSubmit(preferences);
      setSaving(false);
    }, 1500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setPreferences(prev => ({ ...prev, [name]: checked }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="border shadow-md bg-card" >
        <CardContent className="p-6">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-muted-foreground">Press save to continue</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onCancel && onCancel()}
              >
                Cancel
              </Button>
            </div>
            <Progress value={50} className="h-2" />
            {saving && (
              <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">Processing your document...</p>
              </div>
            )}
          </div>

          {/* File info */}
          <div className="mb-6 flex items-center">
            <div className="mr-3 p-2 bg-primary/10 rounded-md">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{fileName}</h3>
              <p className="text-sm text-muted-foreground">{filePages} pages • {fileSize}</p>
            </div>
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs">
              Uploaded
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-5">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title"
                name="title"
                value={preferences.title}
                onChange={handleInputChange}
                placeholder="Enter a title for your summary"
                className="mt-1"
              />
            </div>

            {/* Output Type Selection */}
            <div className="mb-5">
              <Tabs defaultValue="notes" onValueChange={(value) => handleSelectChange("outputType", value)}>
                <TabsList className="grid grid-cols-4 mb-2">
                  <TabsTrigger value="notes" className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="flashcards" className="flex items-center">
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Flashcards
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="flex items-center">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Quiz
                  </TabsTrigger>
                  <TabsTrigger value="none" className="flex items-center">
                    <X className="mr-2 h-4 w-4" />
                    None
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Language Selection */}
            <div className="mb-5">
              <Label>What language do you want us to create in?</Label>
              <Select 
                defaultValue="English"
                onValueChange={(value) => handleSelectChange("language", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                  <SelectItem value="Japanese">Japanese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preferences.outputType === "notes" && (
              <>
                {/* Note Length */}
                <div className="mb-5">
                  <Label>How long should the note be?</Label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <Button
                      type="button"
                      variant={preferences.noteLength === "in-depth" ? "default" : "outline"}
                      onClick={() => handleSelectChange("noteLength", "in-depth")}
                    >
                      In-depth Notes
                    </Button>
                    <Button
                      type="button"
                      variant={preferences.noteLength === "concise" ? "default" : "outline"}
                      onClick={() => handleSelectChange("noteLength", "concise")}
                    >
                      Concise Summary
                    </Button>
                  </div>
                </div>

                {/* Structure Format */}
                <div className="mb-5">
                  <Label>How would you like your notes to be structured?</Label>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <Button
                      type="button"
                      variant={preferences.structureFormat === "outline" ? "default" : "outline"}
                      onClick={() => handleSelectChange("structureFormat", "outline")}
                    >
                      Outline Format
                    </Button>
                    <Button
                      type="button"
                      variant={preferences.structureFormat === "paragraph" ? "default" : "outline"}
                      onClick={() => handleSelectChange("structureFormat", "paragraph")}
                    >
                      Paragraph Format
                    </Button>
                    <Button
                      type="button"
                      variant={preferences.structureFormat === "by-page" ? "default" : "outline"}
                      onClick={() => handleSelectChange("structureFormat", "by-page")}
                    >
                      By file page
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Page Range */}
            <div className="mb-5">
              <Label>What pages would you like?</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <Button
                  type="button"
                  variant={preferences.pageRange === "all" ? "default" : "outline"}
                  onClick={() => handleSelectChange("pageRange", "all")}
                >
                  All pages
                </Button>
                <Button
                  type="button"
                  variant={preferences.pageRange === "custom" ? "default" : "outline"}
                  onClick={() => handleSelectChange("pageRange", "custom")}
                >
                  Custom range
                </Button>
                {preferences.pageRange === "custom" && (
                  <Input
                    name="customPageRange"
                    value={preferences.customPageRange}
                    onChange={handleInputChange}
                    placeholder="e.g. 1, 5, 7-9"
                  />
                )}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="mb-5">
              <Label htmlFor="customPrompt">Custom instructions (optional)</Label>
              <Textarea 
                id="customPrompt"
                name="customPrompt"
                value={preferences.customPrompt}
                onChange={handleInputChange}
                placeholder="Add specific instructions for how to create your summary"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Examples: 
                "Focus on economic concepts" or "Include citations" or "Explain as if to a beginner"</p>
            </div>

            {/* Sharing Options */}
            <div className="mb-5">
              <h3 className="font-medium mb-3">Content sharing</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublic" className="cursor-pointer">Make this public</Label>
                  <Switch
                    id="isPublic"
                    checked={preferences.isPublic}
                    onCheckedChange={(checked) => handleSwitchChange("isPublic", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowPdfViewing" className="cursor-pointer">Allow others to view my pdf too</Label>
                  <Switch
                    id="allowPdfViewing"
                    checked={preferences.allowPdfViewing}
                    onCheckedChange={(checked) => handleSwitchChange("allowPdfViewing", checked)}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-8">
              <Button 
                type="submit" 
                className="flex items-center" 
                disabled={saving}
                size="lg"
              >
                {saving ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Create
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}