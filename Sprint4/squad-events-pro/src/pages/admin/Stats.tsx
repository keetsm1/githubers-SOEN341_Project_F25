import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';

const Stats = () => {
  const { user } = useAuth();
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [orgCounts, setOrgCounts] = useState<{ pending: number | null; approved: number | null; rejected: number | null }>({ pending: null, approved: null, rejected: null });
  const [loadingOrg, setLoadingOrg] = useState<boolean>(true);
  const [registrationsCount, setRegistrationsCount] = useState<number | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number>(0);
  const [publishedEventsCount, setPublishedEventsCount] = useState<number | null>(null);
  const [registrationsThisWeek, setRegistrationsThisWeek] = useState<number | null>(null);
  const [registrationsThisMonth, setRegistrationsThisMonth] = useState<number | null>(null);
  const [topOrganizations, setTopOrganizations] = useState<{ org_name: string; event_count: number }[]>([]);
  const [avgAttendeesPerEvent, setAvgAttendeesPerEvent] = useState<number>(0);
  const [eventsThisMonth, setEventsThisMonth] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [organizationsCount, setOrganizationsCount] = useState<number | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<{ date: string; count: number }[]>([]);
  const [eventActivityData, setEventActivityData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!isSupabaseEnabled || !supabase) {
        setStudentsCount(0);
        setLoading(false);
        setOrgCounts({ pending: 0, approved: 0, rejected: 0 });
        setLoadingOrg(false);
        setRegistrationsCount(0);
        setCheckedInCount(0);
        setAttendanceRate(0);
        setPublishedEventsCount(0);
        setRegistrationsThisWeek(0);
        setRegistrationsThisMonth(0);
        setAvgAttendeesPerEvent(0);
        setEventsThisMonth(0);
        setTotalUsers(0);
        setOrganizationsCount(0);
        return;
      }
      try {
        // Calculate date ranges
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [
          { count: studentCount, error: studentErr },
          pRes,
          aRes,
          rRes,
          regRes,
          checkedInRes,
          publishedEventsRes,
          regWeekRes,
          regMonthRes,
          totalUsersRes,
          eventsThisMonthRes,
          approvedOrgsRes,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student'),
          supabase
            .from('organization_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('organization_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved'),
          supabase
            .from('organization_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'rejected'),
          supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('is_checked_in', true),
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published'),
          supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfWeek.toISOString()),
          supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('organization_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved'),
        ] as const);

        if (studentErr) throw studentErr;
        setStudentsCount(studentCount ?? 0);

        const pending = pRes.count ?? 0;
        const approved = aRes.count ?? 0;
        const rejected = rRes.count ?? 0;
        setOrgCounts({ pending, approved, rejected });

        const regCount = regRes.count ?? 0;
        setRegistrationsCount(regCount);

        const checkedIn = checkedInRes.count ?? 0;
        setCheckedInCount(checkedIn);

        // Calculate attendance rate: (checked in / total registrations) * 100
        const rate = regCount > 0 ? Math.round((checkedIn / regCount) * 100) : 0;
        setAttendanceRate(rate);

        const publishedEvents = publishedEventsRes.count ?? 0;
        setPublishedEventsCount(publishedEvents);

        const regWeek = regWeekRes.count ?? 0;
        setRegistrationsThisWeek(regWeek);

        const regMonth = regMonthRes.count ?? 0;
        setRegistrationsThisMonth(regMonth);

        const totalUsersCount = totalUsersRes.count ?? 0;
        setTotalUsers(totalUsersCount);

        const eventsMonth = eventsThisMonthRes.count ?? 0;
        setEventsThisMonth(eventsMonth);

        const approvedOrgs = approvedOrgsRes.count ?? 0;
        setOrganizationsCount(approvedOrgs);

        // Calculate average attendees per event
        if (publishedEvents > 0 && regCount > 0) {
          const avg = Math.round(regCount / publishedEvents);
          setAvgAttendeesPerEvent(avg);
        } else {
          setAvgAttendeesPerEvent(0);
        }

        // Fetch top 5 organizations by event count
        const { data: topOrgs, error: topOrgsErr } = await supabase
          .from('events')
          .select('org_name')
          .eq('status', 'published')
          .not('org_name', 'is', null);
        
        if (!topOrgsErr && topOrgs) {
          // Count events per organization
          const orgCounts = topOrgs.reduce((acc: Record<string, number>, event: any) => {
            const orgName = event.org_name || 'Unknown';
            acc[orgName] = (acc[orgName] || 0) + 1;
            return acc;
          }, {});

          // Convert to array and sort
          const sortedOrgs = Object.entries(orgCounts)
            .map(([org_name, event_count]) => ({ org_name, event_count: event_count as number }))
            .sort((a, b) => b.event_count - a.event_count)
            .slice(0, 5);

          setTopOrganizations(sortedOrgs);
        }

        // Fetch user growth data for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          return date;
        });

        const userGrowth = await Promise.all(
          last7Days.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', date.toISOString())
              .lt('created_at', nextDay.toISOString());
            
            return {
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              count: count ?? 0
            };
          })
        );
        setUserGrowthData(userGrowth);

        // Fetch event activity data for the last 7 days
        const eventActivity = await Promise.all(
          last7Days.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const { count } = await supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'published')
              .gte('created_at', date.toISOString())
              .lt('created_at', nextDay.toISOString());
            
            return {
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              count: count ?? 0
            };
          })
        );
        setEventActivityData(eventActivity);
      } catch {
        setStudentsCount(null);
        setOrgCounts({ pending: null, approved: null, rejected: null });
        setRegistrationsCount(null);
        setCheckedInCount(null);
        setAttendanceRate(0);
        setPublishedEventsCount(null);
        setRegistrationsThisWeek(null);
        setRegistrationsThisMonth(null);
        setTopOrganizations([]);
        setAvgAttendeesPerEvent(0);
        setEventsThisMonth(null);
        setTotalUsers(null);
        setOrganizationsCount(null);
        setUserGrowthData([]);
        setEventActivityData([]);
      } finally {
        setLoading(false);
        setLoadingOrg(false);
      }
    };
    run();
  }, []);

  if (!user) return <LoginForm />;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Statistics</h1>
          <p className="text-muted-foreground">Comprehensive platform analytics</p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid lg:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Users</p>
                <p className="text-4xl font-bold text-primary">{loading ? '…' : (totalUsers ?? '—')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Students</p>
                <p className="text-4xl font-bold text-blue-600">{loading ? '…' : (studentsCount ?? '—')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Organizations</p>
                <p className="text-4xl font-bold text-purple-600">{loading ? '…' : (organizationsCount ?? '—')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Events</p>
                <p className="text-4xl font-bold text-accent">{loading ? '…' : (publishedEventsCount ?? '—')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Events This Month</p>
                <p className="text-4xl font-bold text-green-600">{loading ? '…' : (eventsThisMonth ?? '—')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Tickets Sold</p>
                <p className="text-4xl font-bold text-orange-600">{loading ? '…' : (registrationsCount ?? '—')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Checked In</p>
                <p className="text-4xl font-bold text-emerald-600">{loading ? '…' : (checkedInCount ?? '—')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Avg Attendees/Event</p>
                <p className="text-4xl font-bold text-pink-600">{loading ? '…' : avgAttendeesPerEvent}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top Organizations by Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topOrganizations.length > 0 ? (
                (() => {
                  const maxCount = Math.max(...topOrganizations.map(org => org.event_count));
                  return (
                    <div className="w-full overflow-hidden">
                      {/* Y-axis label */}
                      <div className="text-xs text-muted-foreground mb-2">Events Created</div>
                      
                      {/* Chart container with fixed height */}
                      <div className="w-full h-[280px] flex flex-col">
                        <div className="flex-1 flex items-end justify-between gap-2 border-l-2 border-b-2 border-muted pl-2 pb-2 min-h-0">
                          {topOrganizations.map((org, index) => {
                            const barHeight = Math.max((org.event_count / maxCount) * 180, 20);
                            return (
                              <div key={org.org_name} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                                {/* Bar with count */}
                                <div className="w-full flex flex-col items-center" style={{ height: `${barHeight}px` }}>
                                  <span className="text-xs font-bold mb-1">{org.event_count}</span>
                                  <div 
                                    className={`w-full rounded-t-lg transition-all flex-1 ${
                                      index === 0 ? 'bg-gradient-to-t from-yellow-600 to-yellow-400' :
                                      index === 1 ? 'bg-gradient-to-t from-gray-500 to-gray-300' :
                                      index === 2 ? 'bg-gradient-to-t from-amber-700 to-amber-500' :
                                      index === 3 ? 'bg-gradient-to-t from-blue-600 to-blue-400' :
                                      'bg-gradient-to-t from-purple-600 to-purple-400'
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Labels below chart */}
                        <div className="flex justify-between gap-2 mt-2 pl-2">
                          {topOrganizations.map((org, index) => (
                            <div key={`label-${org.org_name}`} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                              {/* Rank badge */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                index === 2 ? 'bg-amber-700 text-white' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                              
                              {/* Organization name */}
                              <div className="text-xs text-center font-medium w-full truncate px-1" title={org.org_name}>
                                {org.org_name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {loading ? 'Loading...' : 'No organizations found'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Organization Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Pending</span>
                  <span className="font-bold text-yellow-600">{loadingOrg ? '…' : (orgCounts.pending ?? '—')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all" 
                    style={{ width: `${orgCounts.pending && (orgCounts.pending + orgCounts.approved + orgCounts.rejected) > 0 ? (orgCounts.pending / (orgCounts.pending + orgCounts.approved + orgCounts.rejected) * 100) : 0}%` }} 
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span>Approved</span>
                  <span className="font-bold text-green-600">{loadingOrg ? '…' : (orgCounts.approved ?? '—')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all" 
                    style={{ width: `${orgCounts.approved && (orgCounts.pending + orgCounts.approved + orgCounts.rejected) > 0 ? (orgCounts.approved / (orgCounts.pending + orgCounts.approved + orgCounts.rejected) * 100) : 0}%` }} 
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span>Rejected</span>
                  <span className="font-bold text-red-600">{loadingOrg ? '…' : (orgCounts.rejected ?? '—')}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all" 
                    style={{ width: `${orgCounts.rejected && (orgCounts.pending + orgCounts.approved + orgCounts.rejected) > 0 ? (orgCounts.rejected / (orgCounts.pending + orgCounts.approved + orgCounts.rejected) * 100) : 0}%` }} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Charts Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                User Registrations (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userGrowthData.length > 0 ? (
                (() => {
                  const maxCount = Math.max(...userGrowthData.map(d => d.count), 1);
                  const points = userGrowthData.map((d, i) => {
                    const x = (i / (userGrowthData.length - 1)) * 100;
                    const y = 100 - (d.count / maxCount) * 80;
                    return { x, y, ...d };
                  });
                  
                  const pathData = points.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                  ).join(' ');

                  return (
                    <div className="w-full">
                      <div className="relative w-full h-48 border-l-2 border-b-2 border-muted pl-8">
                        {/* Y-axis labels */}
                        <div className="absolute left-1 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
                          <span>{maxCount}</span>
                          <span>{Math.round(maxCount * 0.5)}</span>
                          <span>0</span>
                        </div>
                        
                        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                          {/* Grid lines */}
                          {[0, 25, 50, 75, 100].map(y => (
                            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.2" className="text-muted" opacity="0.3" />
                          ))}
                          
                          {/* Area under the line */}
                          <path
                            d={`${pathData} L 100 100 L 0 100 Z`}
                            fill="url(#userGradient)"
                            opacity="0.2"
                          />
                          
                          {/* Line */}
                          <path
                            d={pathData}
                            fill="none"
                            stroke="rgb(59, 130, 246)"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Data points */}
                          {points.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r="1.5"
                              fill="rgb(59, 130, 246)"
                              stroke="white"
                              strokeWidth="0.5"
                            />
                          ))}
                          
                          <defs>
                            <linearGradient id="userGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                      
                      {/* X-axis labels */}
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        {userGrowthData.map((d, i) => (
                          <span key={i} className="text-center" style={{ width: `${100 / userGrowthData.length}%` }}>
                            {d.date}
                          </span>
                        ))}
                      </div>
                      
                      {/* Summary */}
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-sm">
                          <span className="font-bold text-blue-600">
                            {userGrowthData.reduce((sum, d) => sum + d.count, 0)}
                          </span>
                          <span className="text-muted-foreground"> new users in the last 7 days</span>
                        </p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Event Creation Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventActivityData.length > 0 ? (
                (() => {
                  const maxCount = Math.max(...eventActivityData.map(d => d.count), 1);
                  const points = eventActivityData.map((d, i) => {
                    const x = (i / (eventActivityData.length - 1)) * 100;
                    const y = 100 - (d.count / maxCount) * 80;
                    return { x, y, ...d };
                  });
                  
                  const pathData = points.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                  ).join(' ');

                  return (
                    <div className="w-full">
                      <div className="relative w-full h-48 border-l-2 border-b-2 border-muted pl-8">
                        {/* Y-axis labels */}
                        <div className="absolute left-1 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
                          <span>{maxCount}</span>
                          <span>{Math.round(maxCount * 0.5)}</span>
                          <span>0</span>
                        </div>
                        
                        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                          {/* Grid lines */}
                          {[0, 25, 50, 75, 100].map(y => (
                            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.2" className="text-muted" opacity="0.3" />
                          ))}
                          
                          {/* Area under the line */}
                          <path
                            d={`${pathData} L 100 100 L 0 100 Z`}
                            fill="url(#eventGradient)"
                            opacity="0.2"
                          />
                          
                          {/* Line */}
                          <path
                            d={pathData}
                            fill="none"
                            stroke="rgb(168, 85, 247)"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Data points */}
                          {points.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r="1.5"
                              fill="rgb(168, 85, 247)"
                              stroke="white"
                              strokeWidth="0.5"
                            />
                          ))}
                          
                          <defs>
                            <linearGradient id="eventGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                              <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                      
                      {/* X-axis labels */}
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        {eventActivityData.map((d, i) => (
                          <span key={i} className="text-center" style={{ width: `${100 / eventActivityData.length}%` }}>
                            {d.date}
                          </span>
                        ))}
                      </div>
                      
                      {/* Summary */}
                      <div className="mt-4 p-3 bg-purple-500/10 rounded-lg">
                        <p className="text-sm">
                          <span className="font-bold text-purple-600">
                            {eventActivityData.reduce((sum, d) => sum + d.count, 0)}
                          </span>
                          <span className="text-muted-foreground"> events created in the last 7 days</span>
                        </p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Registration Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">This Week</span>
                    <span className="text-2xl font-bold text-blue-600">{loading ? '…' : (registrationsThisWeek ?? '—')}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all" 
                      style={{ width: `${registrationsCount && registrationsThisWeek ? Math.min((registrationsThisWeek / registrationsCount) * 100, 100) : 0}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {registrationsCount && registrationsThisWeek ? `${Math.round((registrationsThisWeek / registrationsCount) * 100)}% of total` : '—'}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">This Month</span>
                    <span className="text-2xl font-bold text-purple-600">{loading ? '…' : (registrationsThisMonth ?? '—')}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full transition-all" 
                      style={{ width: `${registrationsCount && registrationsThisMonth ? Math.min((registrationsThisMonth / registrationsCount) * 100, 100) : 0}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {registrationsCount && registrationsThisMonth ? `${Math.round((registrationsThisMonth / registrationsCount) * 100)}% of total` : '—'}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">All Time</span>
                    <span className="text-lg font-bold text-muted-foreground">{loading ? '…' : (registrationsCount ?? '—')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Attendance Rate</span>
                    <span className="text-2xl font-bold text-primary">{loading ? '…' : `${attendanceRate}%`}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div className="bg-gradient-to-r from-primary to-primary/70 h-4 rounded-full transition-all" style={{ width: `${attendanceRate}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Tickets</p>
                    <p className="text-2xl font-bold">{loading ? '…' : (registrationsCount ?? '—')}</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Checked In</p>
                    <p className="text-2xl font-bold text-green-600">{loading ? '…' : (checkedInCount ?? '—')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Stats;