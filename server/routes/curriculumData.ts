import express from 'express';
import { studentCognitiveModelService } from '../services/curriculum/StudentCognitiveModelService';
import { assessmentService } from '../services/curriculum/AssessmentService';
import { adaptiveDifficultyEngine } from '../services/curriculum/AdaptiveDifficultyEngine';

export const curriculumDataRouter = express.Router();

/**
 * GET /api/curriculum/mastery/:subject
 * Get student mastery data for a subject
 */
curriculumDataRouter.get('/mastery/:subject', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { subject } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const knowledgeGaps = await studentCognitiveModelService.getKnowledgeGaps(userId, subject);
    const topicsForReview = await studentCognitiveModelService.getTopicsForReview(userId, 10);
    const reviewSchedule = await studentCognitiveModelService.getOptimalReviewSchedule(userId, subject);
    
    const scheduleArray = Array.from(reviewSchedule.entries()).map(([topicId, reviewDate]) => ({
      topicId,
      reviewDate: reviewDate.toISOString()
    }));
    
    res.json({
      subject,
      knowledgeGaps: knowledgeGaps.slice(0, 10).map(g => ({
        topicId: g.topicId,
        gap: Math.round(g.gap * 100) / 100,
        priority: Math.round(g.priority * 100) / 100
      })),
      topicsForReview: topicsForReview.map(t => ({
        topicId: t.topicId,
        mastery: Math.round(t.probability * 100) / 100,
        confidence: t.confidence,
        lastUpdated: t.lastUpdated
      })),
      reviewSchedule: scheduleArray
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error fetching mastery data:', error);
    res.status(500).json({ error: 'Failed to fetch mastery data' });
  }
});

/**
 * GET /api/curriculum/cognitive-profile
 * Get student cognitive profile with optional subject for enhanced DKT insights
 */
curriculumDataRouter.get('/cognitive-profile', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { subject } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    let profile;
    if (subject && typeof subject === 'string') {
      profile = await studentCognitiveModelService.buildEnhancedCognitiveProfile(userId, subject);
    } else {
      profile = await studentCognitiveModelService.buildCognitiveProfile(userId);
    }
    
    res.json({
      userId: profile.userId,
      overallMastery: Math.round(profile.overallMastery * 100) / 100,
      strongTopics: profile.strongTopics,
      weakTopics: profile.weakTopics,
      learningStyle: profile.learningStyle,
      preferredDifficulty: profile.preferredDifficulty,
      recentProgress: Math.round(profile.recentProgress * 100) / 100,
      dktInsights: profile.dktInsights ? {
        knowledgeGaps: profile.dktInsights.knowledgeGaps,
        transferOpportunities: profile.dktInsights.transferOpportunities,
        optimalReviewTiming: Array.from(profile.dktInsights.optimalReviewTiming.entries()).map(([topicId, date]) => ({
          topicId,
          reviewDate: date.toISOString()
        })),
        learningMomentum: profile.dktInsights.learningMomentum
      } : undefined
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error fetching cognitive profile:', error);
    res.status(500).json({ error: 'Failed to fetch cognitive profile' });
  }
});

/**
 * GET /api/curriculum/dkt/:topicId
 * Get Deep Knowledge Tracing prediction for a specific topic
 */
curriculumDataRouter.get('/dkt/:topicId', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { topicId } = req.params;
    const { subject } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject query parameter required' });
    }
    
    const prediction = await studentCognitiveModelService.runDeepKnowledgeTracing(userId, topicId, subject);
    
    const transferKnowledgeArray = Array.from(prediction.transferKnowledge.entries()).map(([topic, score]) => ({
      topic,
      score: Math.round(score * 100) / 100
    }));
    
    res.json({
      topicId: prediction.topicId,
      masteryProbability: Math.round(prediction.masteryProbability * 100) / 100,
      hiddenState: {
        knowledgeVectorSize: prediction.hiddenState.knowledgeVector.length,
        temporalWeight: Math.round(prediction.hiddenState.temporalWeight * 100) / 100,
        sequencePosition: prediction.hiddenState.sequencePosition
      },
      temporalFactors: {
        recency: Math.round(prediction.temporalFactors.recency * 100) / 100,
        spacing: Math.round(prediction.temporalFactors.spacing * 100) / 100,
        consistency: Math.round(prediction.temporalFactors.consistency * 100) / 100
      },
      transferKnowledge: transferKnowledgeArray,
      predictedNextPerformance: Math.round(prediction.predictedNextPerformance * 100) / 100,
      confidenceInterval: {
        lower: Math.round(prediction.confidenceInterval[0] * 100) / 100,
        upper: Math.round(prediction.confidenceInterval[1] * 100) / 100
      }
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error running DKT:', error);
    res.status(500).json({ error: 'Failed to run deep knowledge tracing' });
  }
});

/**
 * POST /api/curriculum/assessment/generate
 * Generate diagnostic assessment questions
 */
curriculumDataRouter.post('/assessment/generate', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { subject, classLevel, examTarget, questionCount, focusTopics } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    
    const context = {
      userId,
      subject,
      classLevel: classLevel || '10',
      examTarget: examTarget || 'board'
    };
    
    const questions = await assessmentService.generateDiagnosticAssessment(context, {
      questionCount: questionCount || 10,
      focusTopics: focusTopics || []
    });
    
    res.json({
      assessmentId: `assess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      questionCount: questions.length,
      questions: questions.map(q => ({
        id: q.id,
        topic: q.topic,
        text: q.text,
        type: q.type,
        options: q.options,
        cognitiveLevel: q.cognitiveLevel,
        difficulty: q.difficulty,
        marks: q.marks,
        timeLimit: q.timeLimit,
        hints: q.hints
      }))
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error generating assessment:', error);
    res.status(500).json({ error: 'Failed to generate assessment' });
  }
});

/**
 * POST /api/curriculum/assessment/evaluate
 * Evaluate assessment results and get diagnostic report
 */
curriculumDataRouter.post('/assessment/evaluate', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { subject, classLevel, examTarget, questions, results } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!subject || !questions || !results) {
      return res.status(400).json({ error: 'Subject, questions, and results are required' });
    }
    
    const context = {
      userId,
      subject,
      classLevel: classLevel || '10',
      examTarget: examTarget || 'board'
    };
    
    const report = await assessmentService.evaluateAssessment(context, questions, results);
    const summary = assessmentService.generateReportSummary(report);
    
    res.json({
      userId: report.userId,
      subject: report.subject,
      assessmentDate: report.assessmentDate,
      overallScore: Math.round(report.overallScore * 100),
      masteryLevel: Math.round(report.masteryLevel * 100),
      strengthTopics: report.strengthTopics.slice(0, 5).map(t => ({
        topic: t.topic,
        accuracy: Math.round(t.accuracy * 100),
        questionsAttempted: t.questionsAttempted,
        cognitiveLevel: t.cognitiveLevel
      })),
      weaknessTopics: report.weaknessTopics.slice(0, 5).map(t => ({
        topic: t.topic,
        accuracy: Math.round(t.accuracy * 100),
        questionsAttempted: t.questionsAttempted,
        cognitiveLevel: t.cognitiveLevel
      })),
      misconceptionsDetected: report.misconceptionsDetected.slice(0, 5).map(m => ({
        topic: m.topic,
        description: m.description,
        severity: m.severity,
        correctingStrategy: m.correctingStrategy
      })),
      learningPath: report.learningPath.slice(0, 10).map(step => ({
        order: step.order,
        topic: step.topic,
        priority: step.priority,
        reason: step.reason,
        estimatedTime: step.estimatedTime,
        resources: step.resources?.slice(0, 3)
      })),
      cognitiveProfile: report.cognitiveProfile,
      timeAnalysis: report.timeAnalysis,
      confidenceAnalysis: report.confidenceAnalysis,
      summary
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error evaluating assessment:', error);
    res.status(500).json({ error: 'Failed to evaluate assessment' });
  }
});

/**
 * GET /api/curriculum/difficulty/:topic
 * Get adaptive difficulty recommendation for a topic
 */
curriculumDataRouter.get('/difficulty/:topic', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { topic } = req.params;
    const { subject } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject query parameter required' });
    }
    
    const learningVelocity = await studentCognitiveModelService.calculateLearningVelocity(userId, topic);
    const masteryEstimate = await studentCognitiveModelService.getMasteryForTopic(userId, topic);
    const cognitiveProfile = await studentCognitiveModelService.buildCognitiveProfile(userId);
    
    const zdpTarget = 0.7 + (learningVelocity.velocityScore - 0.5) * 0.2;
    
    let recommendedDifficulty = cognitiveProfile.preferredDifficulty;
    if (learningVelocity.trend === 'improving') {
      recommendedDifficulty = Math.min(10, recommendedDifficulty + 1);
    } else if (learningVelocity.trend === 'declining') {
      recommendedDifficulty = Math.max(1, recommendedDifficulty - 1);
    }
    
    let bloomLevel: string;
    const mastery = masteryEstimate?.probability ?? 0.3;
    if (mastery < 0.3) {
      bloomLevel = 'remember';
    } else if (mastery < 0.5) {
      bloomLevel = 'understand';
    } else if (mastery < 0.7) {
      bloomLevel = 'apply';
    } else if (mastery < 0.85) {
      bloomLevel = 'analyze';
    } else {
      bloomLevel = 'evaluate';
    }
    
    res.json({
      topic,
      subject,
      currentMastery: masteryEstimate ? Math.round(masteryEstimate.probability * 100) / 100 : 0.3,
      learningVelocity: {
        score: Math.round(learningVelocity.velocityScore * 100) / 100,
        trend: learningVelocity.trend,
        recommendedPace: learningVelocity.recommendedPace
      },
      adaptiveDifficulty: {
        recommended: recommendedDifficulty,
        zdpTarget: Math.round(zdpTarget * 100) / 100,
        bloomLevel
      },
      rationale: `Based on ${learningVelocity.trend} learning velocity and ${Math.round(mastery * 100)}% mastery, targeting ${bloomLevel}-level questions at difficulty ${recommendedDifficulty}/10.`
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error fetching difficulty:', error);
    res.status(500).json({ error: 'Failed to fetch adaptive difficulty' });
  }
});

/**
 * GET /api/curriculum/prerequisites/:topicId
 * Analyze prerequisites for a topic
 */
curriculumDataRouter.get('/prerequisites/:topicId', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { topicId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const analysis = await studentCognitiveModelService.analyzePrerequisites(userId, topicId);
    
    res.json({
      topicId: analysis.topicId,
      prerequisitesMet: analysis.prerequisitesMet,
      readinessScore: Math.round(analysis.readinessScore * 100) / 100,
      missingPrerequisites: analysis.missingPrerequisites.map(p => ({
        topicId: p.topicId,
        topicName: p.topicName,
        currentMastery: Math.round(p.currentMastery * 100),
        requiredMastery: Math.round(p.requiredMastery * 100),
        gap: Math.round((p.requiredMastery - p.currentMastery) * 100)
      }))
    });
  } catch (error) {
    console.error('[CURRICULUM API] Error analyzing prerequisites:', error);
    res.status(500).json({ error: 'Failed to analyze prerequisites' });
  }
});

console.log('[CURRICULUM API] Routes initialized');
