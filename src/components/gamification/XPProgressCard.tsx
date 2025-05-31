import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Star, Trophy, Target } from "lucide-react";
import { useTraderProgress } from "@/hooks/useTraderProgress";
import { useMemo } from "react";

export function XPProgressCard() {
  const { 
    xp, 
    level, 
    xpToNextLevel, 
    streak, 
    longestStreak,
    dailyXPLog,
    isLoading
  } = useTraderProgress();

  // Calculate today XP from daily log
  const todayXP = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return dailyXPLog[today] || 0;
  }, [dailyXPLog]);

  const currentLevelTotalXP = level * 1000; // Each level requires 1000 XP
  const currentLevelProgress = currentLevelTotalXP - xpToNextLevel;
  const progressPercentage = (currentLevelProgress / currentLevelTotalXP) * 100;

  // Calculate recent activity (last 7 days) - fix date calculation
  const recentXP = useMemo(() => {
    const last7Days = [];
    const today = new Date();
    
    // Generate last 7 days including today
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }
    
    // Debug: Log the calculation details
    const xpBreakdown = last7Days.map(date => ({
      date,
      xp: dailyXPLog[date] || 0,
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
    }));
    
    console.log('🔍 XP Debug:', {
      currentDate: today.toISOString().split('T')[0],
      currentDayName: today.toLocaleDateString('en-US', { weekday: 'long' }),
      totalXP: xp,
      level,
      xpToNextLevel,
      currentLevelTotalXP,
      currentLevelProgress,
      progressPercentage,
      last7Days,
      dailyXPLog,
      xpBreakdown,
      totalRecentXP: xpBreakdown.reduce((sum, item) => sum + item.xp, 0),
      dailyXPLogKeys: Object.keys(dailyXPLog),
      dailyXPLogValues: Object.values(dailyXPLog)
    });
    
    return xpBreakdown.reduce((sum, item) => sum + item.xp, 0);
  }, [dailyXPLog, xp, level, xpToNextLevel, currentLevelTotalXP, currentLevelProgress, progressPercentage]);

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading progress...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-blue-900">
            <Zap className="h-6 w-6 text-blue-600" />
            Trading Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 border-yellow-300">
              <Star className="h-4 w-4" />
              Level {level}
            </Badge>
            {streak >= 3 && (
              <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 border-orange-300">
                <Trophy className="h-3 w-3" />
                {streak} day streak
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main XP Display */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold text-blue-900">
            {xp.toLocaleString()}
          </div>
          <p className="text-lg text-blue-700">Total Experience Points</p>
        </div>

        {/* Progress to Next Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 font-medium">Level {level} Progress</span>
            <span className="text-blue-600">
              {currentLevelProgress}/{currentLevelTotalXP} XP
            </span>
          </div>
          
          <div className="relative">
            <Progress 
              value={progressPercentage} 
              className="h-3 bg-blue-100"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full" 
                 style={{ width: `${Math.min(progressPercentage, 100)}%` }} 
            />
          </div>
          
          <div className="text-center text-sm text-blue-700">
            <span className="font-medium">{xpToNextLevel} XP</span> until Level {level + 1}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-200">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-green-600">+{todayXP}</div>
            <p className="text-xs text-muted-foreground">Today&apos;s XP</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-blue-600">+{recentXP}</div>
            <p className="text-xs text-muted-foreground">Last 7 Days</p>
          </div>
          
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-purple-600">{longestStreak}</div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>

        {/* Level Benefits Preview */}
        <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Next Level Benefits</span>
          </div>
          <p className="text-xs text-blue-700">
            Level {level + 1}: Unlock advanced analytics dashboard and custom performance insights
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 