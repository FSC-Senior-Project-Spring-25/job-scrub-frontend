"use client";

import { useState, useRef, useEffect } from "react";
import type { MatchResponse, SimilarityDetail } from "@/types/types";
import FileUpload from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  Search,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  Info,
  X,
  BarChart4,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [showOnlyMatched, setShowOnlyMatched] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedKeywordDetails, setSelectedKeywordDetails] =
    useState<SimilarityDetail | null>(null);
  const [isKeywordMissing, setIsKeywordMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const chartRef = useRef<HTMLCanvasElement>(null);
  const jobDescriptionRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!file || !jobDescription) {
      setError("Please upload a resume and enter a job description.");
      return;
    }
    setMatchResult(null);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("resumeFile", file);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data: MatchResponse = await response.json();
      setMatchResult(data);
      // Reset filters when new results come in
      setKeywordFilter("");
      setSortOrder("desc");
      setShowOnlyMissing(false);
      setShowOnlyMatched(false);
      setActiveTab("all");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine score color
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-amber-600";
    return "text-red-600";
  };

  // Helper function to determine badge variant
  const getBadgeVariant = (
    score: number
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  // Export results as CSV
  const exportResults = () => {
    if (!matchResult) return;

    let csv = "Keyword,Match Score,Status\n";
    matchResult.similarity_details.forEach((detail) => {
      csv += `"${detail.keyword}",${detail.match_score},"Matched"\n`;
    });

    matchResult.missing_keywords.flat().forEach((keyword) => {
      csv += `"${keyword}",0,"Missing"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-match-results.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Draw chart when results change
  useEffect(() => {
    if (matchResult && chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      // Clear previous chart
      ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);

      // Set up chart dimensions
      const width = chartRef.current.width;
      const height = chartRef.current.height;
      const barWidth = 30;
      const maxBars = 10;
      const padding = 40;

      // Get top keywords by match score
      const topKeywords = [...matchResult.similarity_details]
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, maxBars);

      // Draw axes
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.strokeStyle = "#ccc";
      ctx.stroke();

      // Draw bars
      topKeywords.forEach((keyword, i) => {
        const x = padding + i * (barWidth + 15) + 10;
        const barHeight = (height - 2 * padding) * keyword.match_score;
        const y = height - padding - barHeight;

        // Draw bar
        ctx.fillStyle =
          keyword.match_score >= 0.8
            ? "#22c55e"
            : keyword.match_score >= 0.6
            ? "#eab308"
            : "#ef4444";
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw label
        ctx.save();
        ctx.translate(x + barWidth / 2, height - padding + 10);
        ctx.rotate(Math.PI / 4);
        ctx.textAlign = "left";
        ctx.fillStyle = "#000";
        ctx.font = "10px sans-serif";
        ctx.fillText(
          keyword.keyword.substring(0, 10) +
            (keyword.keyword.length > 10 ? "..." : ""),
          0,
          0
        );
        ctx.restore();

        // Draw score
        ctx.textAlign = "center";
        ctx.fillStyle = "#000";
        ctx.font = "10px sans-serif";
        ctx.fillText(
          (keyword.match_score * 100).toFixed(0) + "%",
          x + barWidth / 2,
          y - 5
        );
      });

      // Draw title
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Top Keyword Matches", width / 2, 20);
    }
  }, [matchResult]);

  // Generate suggestions based on missing keywords
  const generateSuggestions = (keyword: string) => {
    return [
      `Add "${keyword}" to your skills section`,
      `Incorporate "${keyword}" in your work experience descriptions`,
      `If you have experience with ${keyword}, highlight it prominently in your resume`,
      `Consider adding a project that demonstrates your ${keyword} skills`,
    ];
  };

  // Handle keyword click in the job description
  const handleKeywordClick = (keyword: string) => {
    // Check if it's a missing keyword
    const isMissing =
      matchResult?.missing_keywords.flat().includes(keyword) || false;
    setIsKeywordMissing(isMissing);

    // Find keyword details if it's a match
    const keywordDetail =
      matchResult?.similarity_details.find(
        (detail) => detail.keyword.toLowerCase() === keyword.toLowerCase()
      ) || null;

    setSelectedKeyword(keyword);
    setSelectedKeywordDetails(keywordDetail);
  };

  // Highlight keywords in job description
  const highlightJobDescription = () => {
    if (!matchResult || !jobDescription) return jobDescription;

    // Create a map of all keywords for quick lookup
    const keywordMap = new Map();

    // Add matched keywords
    matchResult.similarity_details.forEach((detail) => {
      keywordMap.set(detail.keyword.toLowerCase(), {
        matched: true,
        score: detail.match_score,
      });
    });

    // Add missing keywords
    matchResult.missing_keywords.flat().forEach((keyword) => {
      keywordMap.set(keyword.toLowerCase(), {
        matched: false,
        score: 0,
      });
    });

    // Filter keywords based on active tab
    const filteredKeywords = Array.from(keywordMap.keys()).filter((keyword) => {
      const info = keywordMap.get(keyword);
      if (activeTab === "matched" && !info.matched) return false;
      if (activeTab === "missing" && info.matched) return false;
      return true;
    });

    // If no keywords to highlight, return the original text
    if (filteredKeywords.length === 0) return jobDescription;

    // Create a regex pattern for all keywords
    // Escape special regex characters and join with |
    const pattern = filteredKeywords
      .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const regex = new RegExp(`\\b(${pattern})\\b`, "gi");

    // Split the text by regex matches
    const parts = jobDescription.split(regex);

    // Map each part to text or highlighted span
    return parts.map((part, i) => {
      // Check if this part is a keyword (case insensitive)
      const lowerPart = part.toLowerCase();
      const keywordInfo = keywordMap.get(lowerPart);

      if (keywordInfo) {
        const isMatched = keywordInfo.matched;
        const score = keywordInfo.score;

        // Determine highlight color based on match status and score
        let highlightClass = "";
        if (isMatched) {
          highlightClass =
            score >= 0.8
              ? "bg-green-200 hover:bg-green-300"
              : score >= 0.6
              ? "bg-amber-200 hover:bg-amber-300"
              : "bg-red-200 hover:bg-red-300";
        } else {
          highlightClass = "bg-red-200 hover:bg-red-300";
        }

        // Add additional styling if this is the selected keyword
        const isSelected = selectedKeyword?.toLowerCase() === lowerPart;
        const selectedClass = isSelected ? "ring-2 ring-primary" : "";

        return (
          <button
            key={i}
            className={`px-0.5 rounded cursor-pointer transition-colors ${highlightClass} ${selectedClass}`}
            onClick={() => handleKeywordClick(part)}
          >
            {part}
            {isMatched && (
              <span className="text-xs ml-0.5 font-medium">
                ({(score * 100).toFixed(0)}%)
              </span>
            )}
          </button>
        );
      }

      return part;
    });
  };

  // Filter keywords based on search and tab
  const getFilteredKeywords = () => {
    if (!matchResult) return [];

    let keywords: any[] = [];

    // Add matched keywords if not filtering for missing only
    if (!showOnlyMissing) {
      keywords = [
        ...matchResult.similarity_details
          .filter((detail) =>
            detail.keyword.toLowerCase().includes(keywordFilter.toLowerCase())
          )
          .map((detail) => ({
            keyword: detail.keyword,
            matched: true,
            score: detail.match_score,
          })),
      ];
    }

    // Add missing keywords if not filtering for matched only
    if (!showOnlyMatched) {
      keywords = [
        ...keywords,
        ...matchResult.missing_keywords
          .flat()
          .filter((keyword) =>
            keyword.toLowerCase().includes(keywordFilter.toLowerCase())
          )
          .map((keyword) => ({
            keyword,
            matched: false,
            score: 0,
          })),
      ];
    }

    // Sort keywords
    return keywords.sort((a, b) => {
      if (sortOrder === "asc") {
        return a.score - b.score;
      } else {
        return b.score - a.score;
      }
    });
  };

  return (
    <div
      className={`container mx-auto py-8 px-4 ${
        expandedView ? "max-w-7xl" : "max-w-6xl"
      }`}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Job Scrub</h1>
        <p className="text-muted-foreground mt-2">
          Upload your resume and enter a job description to see how well they
          match
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Resume</CardTitle>
              <CardDescription>
                Upload your resume in PDF or DOCX format
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>We support PDF, DOCX, and TXT formats</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileChange={setFile}
              label="Upload Resume"
              description="Drag & drop your resume here or click to upload"
            />
            {file && (
              <div className="mt-4 flex items-center justify-between p-2 bg-muted rounded-md">
                <span className="text-sm truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>
                Paste the job description you want to match against
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Include the full job description for best results</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[200px] resize-none"
              placeholder="Enter the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center mb-8">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
          className="px-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Check Match"
          )}
        </Button>
      </div>

      {matchResult && (
        <div className="space-y-6">
          {/* Dashboard Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-2xl">Match Results</CardTitle>
                <CardDescription>
                  See how well your resume matches the job description
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={exportResults}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export results as CSV</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setExpandedView(!expandedView)}
                      >
                        {expandedView ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{expandedView ? "Collapse view" : "Expand view"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Overall Match Score
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How well your resume matches the job overall</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-2">
                      <span
                        className={`text-5xl font-bold transition-all duration-500 ${getScoreColor(
                          matchResult.match_score
                        )}`}
                      >
                        {(matchResult.match_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={matchResult.match_score * 100}
                      className="h-3 w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Keyword Coverage
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentage of job keywords found in your resume</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-end gap-2">
                      <span
                        className={`text-5xl font-bold transition-all duration-500 ${getScoreColor(
                          matchResult.keyword_coverage
                        )}`}
                      >
                        {(matchResult.keyword_coverage * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={matchResult.keyword_coverage * 100}
                      className="h-3 w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-muted/50 rounded-lg h-[300px] flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Top Keyword Matches</h3>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <BarChart4 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-grow relative">
                    <canvas
                      ref={chartRef}
                      width={500}
                      height={250}
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Keyword Summary</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-100">
                        {matchResult.similarity_details.length} matched
                      </Badge>
                      <Badge variant="outline" className="bg-red-100">
                        {matchResult.missing_keywords.flat().length} missing
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        Match Legend:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-green-200 mr-1 rounded"></span>
                          <span className="text-xs">Strong Match (80%+)</span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-amber-200 mr-1 rounded"></span>
                          <span className="text-xs">
                            Partial Match (60-79%)
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-block w-3 h-3 bg-red-200 mr-1 rounded"></span>
                          <span className="text-xs">Weak Match or Missing</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        Instructions:
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Click on any highlighted keyword in the job description
                        below to see details and suggestions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Job Description Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Interactive Job Description</CardTitle>
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter Keywords
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="p-2">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Show Keywords</h4>
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="matched-only"
                                checked={showOnlyMatched}
                                onCheckedChange={(checked) => {
                                  setShowOnlyMatched(checked);
                                  if (checked) setShowOnlyMissing(false);
                                }}
                              />
                              <Label htmlFor="matched-only">Matched only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="missing-only"
                                checked={showOnlyMissing}
                                onCheckedChange={(checked) => {
                                  setShowOnlyMissing(checked);
                                  if (checked) setShowOnlyMatched(false);
                                }}
                              />
                              <Label htmlFor="missing-only">Missing only</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardDescription>
                Keywords are highlighted in the job description. Click on any
                highlighted keyword to see details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Job Description with Highlights */}
                <div className="flex-grow">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full mb-4"
                  >
                    <TabsList>
                      <TabsTrigger value="all">All Keywords</TabsTrigger>
                      <TabsTrigger value="matched">Matched Only</TabsTrigger>
                      <TabsTrigger value="missing">Missing Only</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div
                    ref={jobDescriptionRef}
                    className="p-4 bg-muted/50 rounded-lg max-h-[500px] overflow-y-auto whitespace-pre-wrap"
                  >
                    {highlightJobDescription()}
                  </div>
                </div>

                {/* Keyword List */}
                <div className="lg:w-1/3">
                  <div className="sticky top-4">
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search keywords..."
                          value={keywordFilter}
                          onChange={(e) => setKeywordFilter(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Keywords</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Sort:{" "}
                            {sortOrder === "desc"
                              ? "Highest First"
                              : "Lowest First"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSortOrder("desc")}
                          >
                            Highest Match First
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortOrder("asc")}>
                            Lowest Match First
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {getFilteredKeywords().map((item, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${
                            selectedKeyword === item.keyword
                              ? "ring-2 ring-primary"
                              : ""
                          } ${
                            item.matched
                              ? item.score >= 0.8
                                ? "bg-green-50 border border-green-200"
                                : item.score >= 0.6
                                ? "bg-amber-50 border border-amber-200"
                                : "bg-red-50 border border-red-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                          onClick={() => handleKeywordClick(item.keyword)}
                        >
                          <div className="flex items-center">
                            <Badge
                              variant={
                                item.matched
                                  ? getBadgeVariant(item.score)
                                  : "destructive"
                              }
                              className="mr-2"
                            >
                              {item.matched ? "Match" : "Missing"}
                            </Badge>
                            <span className="font-medium">{item.keyword}</span>
                          </div>
                          {item.matched && (
                            <span
                              className={`text-sm font-bold ${getScoreColor(
                                item.score
                              )}`}
                            >
                              {(item.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      ))}

                      {getFilteredKeywords().length === 0 && (
                        <div className="text-center p-4 text-muted-foreground">
                          No keywords match your current filters.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keyword Detail Dialog */}
          <Dialog
            open={!!selectedKeyword}
            onOpenChange={(open) => !open && setSelectedKeyword(null)}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Badge
                    variant={
                      isKeywordMissing
                        ? "destructive"
                        : getBadgeVariant(
                            selectedKeywordDetails?.match_score || 0
                          )
                    }
                    className="mr-2"
                  >
                    {isKeywordMissing ? "Missing" : "Match"}
                  </Badge>
                  Keyword: {selectedKeyword}
                  {!isKeywordMissing && selectedKeywordDetails && (
                    <span
                      className={`ml-2 text-sm ${getScoreColor(
                        selectedKeywordDetails.match_score
                      )}`}
                    >
                      ({(selectedKeywordDetails.match_score * 100).toFixed(0)}%
                      match)
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {isKeywordMissing
                    ? "This keyword appears in the job description but not in your resume."
                    : "This keyword appears in both the job description and your resume."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-medium mb-2">
                    Context in Job Description:
                  </h4>
                  <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-y-auto">
                    {jobDescription
                      .split(new RegExp(`\\b(${selectedKeyword})\\b`, "gi"))
                      .map((part, i) =>
                        part.toLowerCase() ===
                        selectedKeyword?.toLowerCase() ? (
                          <mark
                            key={i}
                            className="bg-yellow-200 px-0.5 rounded"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
                  </div>
                </div>

                <div>
                  {isKeywordMissing ? (
                    <>
                      <h4 className="font-medium mb-2">Suggestions:</h4>
                      <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-y-auto">
                        <ul className="list-disc list-inside space-y-2">
                          {generateSuggestions(selectedKeyword || "").map(
                            (suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            )
                          )}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium mb-2">
                        Where it appears in your resume:
                      </h4>
                      <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-y-auto">
                        <p className="italic text-muted-foreground">
                          This is a simulated view. In a real implementation, we
                          would show the actual context from your resume.
                        </p>
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <p>
                            <span className="font-medium">Skills section:</span>{" "}
                            JavaScript, React,{" "}
                            <mark className="bg-yellow-200 px-0.5 rounded">
                              {selectedKeyword}
                            </mark>
                            , HTML, CSS
                          </p>
                        </div>
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <p>
                            <span className="font-medium">Experience:</span>{" "}
                            "Used{" "}
                            <mark className="bg-yellow-200 px-0.5 rounded">
                              {selectedKeyword}
                            </mark>{" "}
                            to develop scalable solutions..."
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isKeywordMissing && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">
                    Impact on your match score:
                  </h4>
                  <Alert>
                    <AlertTitle className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Adding this keyword could improve your match
                    </AlertTitle>
                    <AlertDescription>
                      Including "{selectedKeyword}" in your resume could
                      increase your keyword coverage and overall match score.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedKeyword(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
