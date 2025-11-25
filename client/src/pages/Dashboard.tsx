import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Brain, Calendar, Award, ChevronRight
} from "lucide-react";
import { AvatarTutorCard } from "@/components/dashboard/AvatarTutorCard";
import { DocChatCard } from "@/components/dashboard/DocChatCard";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";

interface DashboardStats {
  activeSessions: number;
  quizAccuracy: number;
  studyTime: number;
  goalsAchieved: number;
  totalGoals: number;
}

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  time: string;
  subject?: string;
}

interface TaskItem {
  id: string;
  icon?: string;
  status?: string;
  title?: string;
  duration?: string;
  subject?: string;
  // Additional properties for flexibility
  color?: string;
  task?: string;
  time?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');

  // Fetch real dashboard data
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError, error: statsError } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    retry: 2, // Retry failed requests twice
  });

  const { data: recentActivity, isLoading: isActivityLoading, isError: isActivityError, error: activityError } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
    retry: 2,
  });

  const { data: upcomingTasks, isError: isTasksError } = useQuery<TaskItem[]>({
    queryKey: ["/api/tasks/upcoming"],
    retry: 2,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const firstName = user?.firstName || "Student";

  // Mock data for gamification (replace with real API data later)
  const streak = 7;
  const xp = 2450;
  const level = 12;
  const nextLevelXP = 3000;
  const xpProgress = (xp / nextLevelXP) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-gray-600">
            Choose your learning mode and start your journey today
          </p>
        </motion.div>

        {/* Compact Stats Bar */}
        <StatsBar stats={stats} isLoading={isStatsLoading} isError={isStatsError} className="mb-8" />

        {/* Main Grid Layout - Hero Cards + Sidebar */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left Column - Hero Feature Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Cards Grid - 2 columns on larger screens */}
            <div className="grid md:grid-cols-2 gap-6">
              <AvatarTutorCard />
              <DocChatCard />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity Feed */}
            <RecentActivityFeed activities={recentActivity} isLoading={isActivityLoading} isError={isActivityError} />

            {/* Level Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-200"
              data-testid="card-level-progress"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Your Level</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    Level {level}
                  </div>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {level}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP</span>
                  <span className="font-semibold text-gray-900">{Math.round(xpProgress)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-600 rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Today's Schedule Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200" data-testid="card-today-schedule">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold">Today's Schedule</h3>
              </div>

              <div className="space-y-3">
                {(upcomingTasks || [
                  { id: '1', time: '10:00 AM', task: 'Complete Chapter 2', color: 'orange' },
                  { id: '2', time: '02:00 PM', task: 'Take Practice Quiz', color: 'purple' },
                  { id: '3', time: '05:00 PM', task: 'Review Notes', color: 'blue' },
                ]).slice(0, 3).map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                    data-testid={`schedule-item-${item.id}`}
                  >
                    <div className="w-1 h-full bg-primary-500 rounded-full flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.task || item.title}</div>
                      <div className="text-xs text-gray-500">{item.time || item.duration}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
