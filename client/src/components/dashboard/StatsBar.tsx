/**
 * 📊 Compact Gamification Stats Bar
 * Horizontal stats display - Streak, XP, Chapters, Accuracy
 */

import { motion } from 'framer-motion';
import { Flame, Zap, BookOpen, Target, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
  index: number;
}

function StatItem({ icon: Icon, label, value, gradient, index }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-1 min-w-[140px] bg-white rounded-2xl p-4 border border-gray-200 hover:shadow-md transition group cursor-pointer"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon with Gradient Background */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Value & Label */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-gray-900 truncate">
            {value}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface StatsBarProps {
  stats?: {
    activeSessions?: number;
    quizAccuracy?: number;
    studyTime?: number;
    goalsAchieved?: number;
    totalGoals?: number;
  };
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

function StatSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-1 min-w-[140px] bg-white rounded-2xl p-4 border border-gray-200"
      data-testid={`stat-skeleton-${index}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon Skeleton */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex-shrink-0" />
        
        {/* Value & Label Skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-7 bg-gray-200 rounded animate-pulse w-16" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
        </div>
      </div>
    </motion.div>
  );
}

export function StatsBar({ stats, isLoading = false, isError = false, className = '' }: StatsBarProps) {
  // Use real API data - no hardcoded fallbacks
  const activeSessions = stats?.activeSessions ?? 0;
  const accuracy = stats?.quizAccuracy ?? 0;
  const studyTime = stats?.studyTime ?? 0;
  const goalsProgress = stats?.totalGoals 
    ? `${stats.goalsAchieved || 0}/${stats.totalGoals}` 
    : '0';

  const statsData = [
    {
      icon: Flame,
      label: 'Active Sessions',
      value: activeSessions.toString(),
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Zap,
      label: 'Study Time',
      value: `${studyTime}h`,
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: BookOpen,
      label: 'Goals Progress',
      value: goalsProgress,
      gradient: 'from-blue-500 to-purple-500',
    },
    {
      icon: Target,
      label: 'Quiz Accuracy',
      value: `${accuracy}%`,
      gradient: 'from-green-500 to-teal-500',
    },
  ];

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
  };

  // Show error UI if request failed
  if (isError) {
    return (
      <div className={`${className}`} data-testid="container-stats-bar-error">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Failed to load stats</h3>
              <p className="text-sm text-red-700">Could not fetch your statistics</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            data-testid="button-retry-stats"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  // Show skeleton loaders while loading
  if (isLoading) {
    return (
      <div className={`${className}`} data-testid="container-stats-bar-loading">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2">
          {[0, 1, 2, 3].map((index) => (
            <StatSkeleton key={index} index={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} data-testid="container-stats-bar">
      {/* Stats Grid - 4 columns on desktop, scroll on mobile */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
        {statsData.map((stat, index) => (
          <StatItem
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            gradient={stat.gradient}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
