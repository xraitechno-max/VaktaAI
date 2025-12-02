import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export interface MasteryData {
  subject: string;
  knowledgeGaps: Array<{
    topicId: string;
    gap: number;
    priority: number;
  }>;
  topicsForReview: Array<{
    topicId: string;
    mastery: number;
    confidence: 'low' | 'medium' | 'high';
    lastUpdated: string;
  }>;
  reviewSchedule: Array<{
    topicId: string;
    reviewDate: string;
  }>;
}

export interface CognitiveProfile {
  userId: string;
  overallMastery: number;
  strongTopics: string[];
  weakTopics: string[];
  learningStyle: 'fast_learner' | 'steady' | 'needs_support';
  preferredDifficulty: number;
  recentProgress: number;
  dktInsights?: {
    knowledgeGaps: string[];
    transferOpportunities: string[];
    optimalReviewTiming: Array<{
      topicId: string;
      reviewDate: string;
    }>;
    learningMomentum: number;
  };
}

export interface DKTPrediction {
  topicId: string;
  masteryProbability: number;
  hiddenState: {
    knowledgeVectorSize: number;
    temporalWeight: number;
    sequencePosition: number;
  };
  temporalFactors: {
    recency: number;
    spacing: number;
    consistency: number;
  };
  transferKnowledge: Array<{
    topic: string;
    score: number;
  }>;
  predictedNextPerformance: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface AssessmentQuestion {
  id: string;
  topic: string;
  text: string;
  type: 'mcq' | 'short_answer' | 'numerical' | 'true_false' | 'fill_blank';
  options?: string[];
  cognitiveLevel: string;
  difficulty: number;
  marks: number;
  timeLimit?: number;
  hints?: string[];
}

export interface AssessmentResult {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface DiagnosticReport {
  userId: string;
  subject: string;
  assessmentDate: string;
  overallScore: number;
  masteryLevel: number;
  strengthTopics: Array<{
    topic: string;
    accuracy: number;
    questionsAttempted: number;
    cognitiveLevel: string;
  }>;
  weaknessTopics: Array<{
    topic: string;
    accuracy: number;
    questionsAttempted: number;
    cognitiveLevel: string;
  }>;
  misconceptionsDetected: Array<{
    topic: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    correctingStrategy: string;
  }>;
  learningPath: Array<{
    order: number;
    topic: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedTime: string;
    resources?: string[];
  }>;
  cognitiveProfile: Record<string, any>;
  timeAnalysis: Record<string, any>;
  confidenceAnalysis: Record<string, any>;
  summary: string;
}

export interface AdaptiveDifficulty {
  topic: string;
  subject: string;
  currentMastery: number;
  learningVelocity: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    recommendedPace: 'faster' | 'maintain' | 'slower';
  };
  adaptiveDifficulty: {
    recommended: number;
    zdpTarget: number;
    bloomLevel: string;
  };
  rationale: string;
}

export interface PrerequisiteAnalysis {
  topicId: string;
  prerequisitesMet: boolean;
  readinessScore: number;
  missingPrerequisites: Array<{
    topicId: string;
    topicName: string;
    currentMastery: number;
    requiredMastery: number;
    gap: number;
  }>;
}

export function useMasteryData(subject: string | undefined) {
  const encodedSubject = subject ? encodeURIComponent(subject) : '';
  return useQuery<MasteryData>({
    queryKey: [`/api/curriculum/mastery/${encodedSubject}`],
    enabled: !!subject
  });
}

export function useCognitiveProfile(subject?: string) {
  const url = subject 
    ? `/api/curriculum/cognitive-profile?subject=${encodeURIComponent(subject)}`
    : '/api/curriculum/cognitive-profile';
  return useQuery<CognitiveProfile>({
    queryKey: [url]
  });
}

export function useDKTPrediction(topicId: string | undefined, subject: string | undefined) {
  return useQuery<DKTPrediction>({
    queryKey: [`/api/curriculum/dkt/${topicId}?subject=${encodeURIComponent(subject || '')}`],
    enabled: !!topicId && !!subject
  });
}

export function useAdaptiveDifficulty(topic: string | undefined, subject: string | undefined) {
  return useQuery<AdaptiveDifficulty>({
    queryKey: [`/api/curriculum/difficulty/${encodeURIComponent(topic || '')}?subject=${encodeURIComponent(subject || '')}`],
    enabled: !!topic && !!subject
  });
}

export function usePrerequisiteAnalysis(topicId: string | undefined) {
  const encodedTopicId = topicId ? encodeURIComponent(topicId) : '';
  return useQuery<PrerequisiteAnalysis>({
    queryKey: [`/api/curriculum/prerequisites/${encodedTopicId}`],
    enabled: !!topicId
  });
}

export function useGenerateAssessment() {
  return useMutation({
    mutationFn: async (params: {
      subject: string;
      classLevel?: string;
      examTarget?: string;
      questionCount?: number;
      focusTopics?: string[];
    }) => {
      const response = await apiRequest('POST', '/api/curriculum/assessment/generate', params);
      return response.json();
    }
  });
}

export function useEvaluateAssessment() {
  return useMutation({
    mutationFn: async (params: {
      subject: string;
      classLevel?: string;
      examTarget?: string;
      questions: AssessmentQuestion[];
      results: AssessmentResult[];
    }) => {
      const response = await apiRequest('POST', '/api/curriculum/assessment/evaluate', params);
      return response.json();
    },
    onSuccess: (_, variables) => {
      const encodedSubject = encodeURIComponent(variables.subject);
      queryClient.invalidateQueries({ queryKey: [`/api/curriculum/mastery/${encodedSubject}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/curriculum/cognitive-profile'] });
      if (variables.subject) {
        queryClient.invalidateQueries({ queryKey: [`/api/curriculum/cognitive-profile?subject=${encodedSubject}`] });
      }
    }
  });
}

export function useStudentProgress(subject?: string) {
  const masteryQuery = useMasteryData(subject);
  const profileQuery = useCognitiveProfile(subject);
  
  return {
    mastery: masteryQuery.data,
    profile: profileQuery.data,
    isLoading: masteryQuery.isLoading || profileQuery.isLoading,
    isError: masteryQuery.isError || profileQuery.isError,
    error: masteryQuery.error || profileQuery.error
  };
}
