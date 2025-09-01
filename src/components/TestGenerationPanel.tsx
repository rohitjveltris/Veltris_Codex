import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FlaskConical, 
  Target, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  Code,
  FileText,
  Layers
} from 'lucide-react';

import { testGenerationApi, TestGenerationUtils } from '@/lib/testGenerationApi';
import {
  TestGenerationParams,
  TestSuite,
  TestabilityAnalysis,
  SupportedFrameworks,
  TestGenerationSettings,
} from '@/types/testGeneration';

interface TestGenerationPanelProps {
  currentFilePath: string | null;
  currentFileContent: string;
  onTestSuiteGenerated: (testSuite: TestSuite) => void;
}

export const TestGenerationPanel: React.FC<TestGenerationPanelProps> = ({
  currentFilePath,
  currentFileContent,
  onTestSuiteGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [testabilityAnalysis, setTestabilityAnalysis] = useState<TestabilityAnalysis | null>(null);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [supportedFrameworks, setSupportedFrameworks] = useState<SupportedFrameworks>({});
  const [settings, setSettings] = useState<TestGenerationSettings>({
    framework: 'auto',
    testTypes: ['unit'],
    coverageTarget: 85,
    mockExternal: true,
    includeEdgeCases: true,
    maxTestsPerFunction: 8,
    autoRun: false,
    generateMocks: true,
    includePerformanceTests: false,
  });

  const currentLanguage = currentFilePath ? getLanguageFromFilePath(currentFilePath) : 'javascript';
  const availableFrameworks = supportedFrameworks[currentLanguage] || [];

  useEffect(() => {
    loadSupportedFrameworks();
  }, []);

  useEffect(() => {
    if (currentFilePath && currentFileContent) {
      analyzeCurrentFile();
    }
  }, [currentFilePath, currentFileContent]);

  const loadSupportedFrameworks = async () => {
    try {
      const frameworks = await testGenerationApi.getSupportedFrameworks();
      setSupportedFrameworks(frameworks);
    } catch (error) {
      console.error('Failed to load supported frameworks:', error);
    }
  };

  const analyzeCurrentFile = async () => {
    if (!currentFilePath || !currentFileContent) return;

    try {
      const params: TestGenerationParams = {
        file_path: currentFilePath,
        code_content: currentFileContent,
        framework: settings.framework,
      };

      const analysis = await testGenerationApi.analyzeTestability(params);
      setTestabilityAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze testability:', error);
    }
  };

  const generateTests = async () => {
    if (!currentFilePath || !currentFileContent) return;

    setIsGenerating(true);
    try {
      const params: TestGenerationParams = {
        file_path: currentFilePath,
        code_content: currentFileContent,
        test_types: settings.testTypes,
        framework: settings.framework,
        coverage_target: settings.coverageTarget,
        mock_external: settings.mockExternal,
        include_edge_cases: settings.includeEdgeCases,
        max_tests_per_function: settings.maxTestsPerFunction,
      };

      const generatedSuite = await testGenerationApi.generateTests(params);
      setTestSuite(generatedSuite);
      onTestSuiteGenerated(generatedSuite);
    } catch (error) {
      console.error('Failed to generate tests:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSettings = (newSettings: Partial<TestGenerationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  function getLanguageFromFilePath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
    };
    return langMap[ext || ''] || 'javascript';
  }

  const getTestabilityColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTestabilityLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Test Generation
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <Tabs defaultValue="analysis" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="generation">Generation</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="space-y-4">
              {/* Current File Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current File</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentFilePath ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span className="text-sm font-mono">{currentFilePath}</span>
                        <Badge variant="secondary">{currentLanguage}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentFileContent.split('\n').length} lines • {
                          TestGenerationUtils.extractFunctionNames(currentFileContent, currentLanguage).length
                        } functions
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No file selected</div>
                  )}
                </CardContent>
              </Card>

              {/* Testability Analysis */}
              {testabilityAnalysis && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Testability Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${getTestabilityColor(testabilityAnalysis.testability_score)}`} />
                          <span className="font-medium">
                            {testabilityAnalysis.testability_score.toFixed(1)}/10
                          </span>
                          <Badge variant="outline">
                            {getTestabilityLabel(testabilityAnalysis.testability_score)}
                          </Badge>
                        </div>
                        <Progress 
                          value={testabilityAnalysis.testability_score * 10} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Testable Functions</div>
                        <div className="font-medium">{testabilityAnalysis.testable_functions.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Complex Functions</div>
                        <div className="font-medium">{testabilityAnalysis.complex_functions.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Dependencies</div>
                        <div className="font-medium">{testabilityAnalysis.dependencies.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Existing Tests</div>
                        <div className="font-medium">{testabilityAnalysis.existing_tests.length}</div>
                      </div>
                    </div>

                    {testabilityAnalysis.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Recommendations</Label>
                        <div className="space-y-1">
                          {testabilityAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                            <div key={index} className="flex items-start gap-2 text-xs">
                              <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                              <span className="text-muted-foreground">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={analyzeCurrentFile}
                disabled={!currentFilePath || !currentFileContent}
                className="w-full"
                variant="outline"
              >
                <Target className="h-4 w-4 mr-2" />
                Re-analyze File
              </Button>
            </div>
          </TabsContent>

          {/* Generation Tab */}
          <TabsContent value="generation" className="space-y-4">
            <div className="space-y-4">
              {/* Quick Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="framework">Testing Framework</Label>
                    <Select
                      value={settings.framework}
                      onValueChange={(value) => updateSettings({ framework: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select framework" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        {availableFrameworks.map((framework) => (
                          <SelectItem key={framework} value={framework}>
                            {framework}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Coverage Target: {settings.coverageTarget}%</Label>
                    <Slider
                      value={[settings.coverageTarget]}
                      onValueChange={([value]) => updateSettings({ coverageTarget: value })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="mock-external">Mock External Dependencies</Label>
                    <Switch
                      id="mock-external"
                      checked={settings.mockExternal}
                      onCheckedChange={(checked) => updateSettings({ mockExternal: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="edge-cases">Include Edge Cases</Label>
                    <Switch
                      id="edge-cases"
                      checked={settings.includeEdgeCases}
                      onCheckedChange={(checked) => updateSettings({ includeEdgeCases: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button 
                onClick={generateTests}
                disabled={!currentFilePath || !currentFileContent || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Tests...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Tests
                  </>
                )}
              </Button>

              {/* Test Suite Preview */}
              {testSuite && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Generated Test Suite
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Test Cases</div>
                        <div className="font-medium">{testSuite.test_cases.length}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Coverage</div>
                        <div className="font-medium">{testSuite.coverage_estimate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Framework</div>
                        <div className="font-medium">{testSuite.framework}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Quality Score</div>
                        <div className="font-medium">{testSuite.quality_score.toFixed(1)}/10</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Test File</Label>
                      <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                        {testSuite.test_file_path}
                      </div>
                    </div>

                    <Progress 
                      value={testSuite.coverage_estimate} 
                      className="h-2"
                    />

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Code className="h-3 w-3 mr-1" />
                        Preview Code
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Apply Tests
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Test Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Test Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {['unit', 'integration', 'e2e'].map((type) => (
                          <Button
                            key={type}
                            size="sm"
                            variant={settings.testTypes.includes(type) ? 'default' : 'outline'}
                            onClick={() => {
                              const newTypes = settings.testTypes.includes(type)
                                ? settings.testTypes.filter(t => t !== type)
                                : [...settings.testTypes, type];
                              updateSettings({ testTypes: newTypes });
                            }}
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Tests per Function: {settings.maxTestsPerFunction}</Label>
                      <Slider
                        value={[settings.maxTestsPerFunction]}
                        onValueChange={([value]) => updateSettings({ maxTestsPerFunction: value })}
                        max={15}
                        min={3}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Advanced Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-run">Auto-run Generated Tests</Label>
                      <Switch
                        id="auto-run"
                        checked={settings.autoRun}
                        onCheckedChange={(checked) => updateSettings({ autoRun: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="generate-mocks">Generate Mock Data</Label>
                      <Switch
                        id="generate-mocks"
                        checked={settings.generateMocks}
                        onCheckedChange={(checked) => updateSettings({ generateMocks: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="performance-tests">Include Performance Tests</Label>
                      <Switch
                        id="performance-tests"
                        checked={settings.includePerformanceTests}
                        onCheckedChange={(checked) => updateSettings({ includePerformanceTests: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => updateSettings({
                    framework: 'auto',
                    testTypes: ['unit'],
                    coverageTarget: 85,
                    mockExternal: true,
                    includeEdgeCases: true,
                    maxTestsPerFunction: 8,
                    autoRun: false,
                    generateMocks: true,
                    includePerformanceTests: false,
                  })}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};