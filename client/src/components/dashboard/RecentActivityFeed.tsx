/**
 * 📋 Recent Activity Feed Component
 * Displays recent chats, uploads, quizzes with timestamps and quick actions
 */

import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Brain, FileText, Target, ChevronRight, Clock,
  MessageSquare, Upload, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';

interface ActivityItem {
  id: string;
  type: 'tutor' | 'docchat' | 'quiz';
  title: string;
  description?: string; // Optional - can be derived from title
  time: string;
  href?: string; // Optional - can be derived from type
  icon?: string; // Backend returns this
}

interface RecentActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

function ActivitySkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl p-4 border border-gray-200"
      data-testid={`activity-skeleton-${index}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon Skeleton */}
        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse flex-shrink-0" />
        
        {/* Content Skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
        </div>
      </div>
    </motion.div>
  );
}

const activityIcons = {
  tutor: { icon: Brain, color: 'from-purple-500 to-indigo-600', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  docchat: { icon: FileText, color: 'from-blue-500 to-cyan-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  quiz: { icon: Target, color: 'from-pink-500 to-rose-600', bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
};

export function RecentActivityFeed({ activities, isLoading = false, isError = false, className = '' }: RecentActivityFeedProps) {
  // Mock data if no activities provided
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'quiz',
      title: 'Completed Quiz',
      description: 'Physics - Electric Charges & Fields',
      time: '2 hours ago',
      href: '/quiz'
    },
    {
      id: '2',
      type: 'tutor',
      title: 'Asked AI Mentor',
      description: "Explained Coulomb's Law with examples",
      time: '5 hours ago',
      href: '/tutor'
    },
    {
      id: '3',
      type: 'docchat',
      title: 'Uploaded Document',
      description: 'NCERT Chemistry Chapter 3 notes',
      time: 'Yesterday',
      href: '/docchat'
    },
    {
      id: '4',
      type: 'tutor',
      title: 'Voice Session',
      description: 'Discussed quadratic equations',
      time: '2 days ago',
      href: '/tutor'
    },
  ];

  const displayActivities = activities || defaultActivities;

  // Quick action buttons
  const quickActions = [
    { label: 'Take Quiz', icon: Target, href: '/quiz', color: 'from-pink-500 to-rose-600' },
    { label: 'Study Plan', icon: CheckCircle, href: '/study-plan', color: 'from-green-500 to-teal-600' },
  ];

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/activity'] });
  };

  return (
    <div className={`space-y-6 ${className}`} data-testid="container-recent-activity">
      {/* Recent Activity Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <button
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition"
            data-testid="link-view-all-activity"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {isError ? (
            // Show error state
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-6"
              data-testid="activity-error-state"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">Failed to load activity</h4>
                  <p className="text-sm text-red-700">Could not fetch your recent activities</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                data-testid="button-retry-activity"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </Button>
            </motion.div>
          ) : isLoading ? (
            // Show skeleton loaders while loading
            [0, 1, 2, 3].map((index) => (
              <ActivitySkeleton key={index} index={index} />
            ))
          ) : (
            // Show actual activities
            displayActivities.slice(0, 4).map((activity, index) => {
              const config = activityIcons[activity.type];
              const Icon = config.icon;
              
              // Compute href from type if not provided
              const href = activity.href || (
                activity.type === 'tutor' ? '/tutor' :
                activity.type === 'docchat' ? '/docchat' :
                '/quiz'
              );
              
              // Use description if provided, otherwise use title
              const description = activity.description || activity.title;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 5 }}
                  className="group"
                >
                  <Link href={href}>
                    <div
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition cursor-pointer"
                      data-testid={`activity-item-${activity.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Activity Icon */}
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.textColor}`} />
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 mb-1 truncate">
                            {activity.title}
                          </div>
                          <div className="text-sm text-gray-600 truncate">
                            {description}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            {activity.time}
                          </div>
                        </div>

                        {/* Hover Arrow */}
                        <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
              >
                <Link href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover-elevate"
                    data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
