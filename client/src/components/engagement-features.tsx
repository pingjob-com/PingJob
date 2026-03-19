import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Zap, TrendingUp, CheckCircle, AlertCircle, Target,
  Users, Star, ArrowRight, Loader2, ChevronRight,
  MapPin, DollarSign, Briefcase, Activity, Trophy
} from "lucide-react";
import { Link } from "wouter";

// ─── Feature 1: Live Hiring Activity Feed (Ticker) ───────────────────────────
interface ActivityItem { type: 'company' | 'candidate'; text: string; }

export function LiveActivityFeed() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const { data } = useQuery({
    queryKey: ['/api/stats/activity'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/stats/activity');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000
  });

  const items: ActivityItem[] = data?.items?.length ? data.items : [
    { type: 'company', text: 'Companies actively posting new jobs' },
    { type: 'candidate', text: 'Candidates uploading resumes now' },
  ];

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % items.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[currentIdx];
  const isCompany = current?.type === 'company';

  return (
    <div className={`text-white py-2.5 px-4 transition-colors duration-500 ${isCompany ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Live</span>
        </div>
        <div className="flex-1 overflow-hidden flex items-center gap-2">
          <span className="text-base flex-shrink-0">{isCompany ? '🏢' : '👤'}</span>
          <p
            className={`text-sm font-medium ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
            style={{ transition: 'opacity 0.4s, transform 0.4s' }}
          >
            {current?.text}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIdx(i); setVisible(true); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIdx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feature 2: Instant Job Match Bar ────────────────────────────────────────
interface MatchJob {
  id: number;
  title: string;
  companyName: string;
  location: string;
  salary?: string;
  matchPct: number;
  matchedSkills: string[];
  missingSkills: string[];
  applicationCount: number;
  companyMatch?: boolean;
  locationMatch?: boolean;
}

export function InstantJobMatchBar() {
  const [inputText, setInputText] = useState("");
  const [matchResults, setMatchResults] = useState<MatchJob[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const handleMatch = async () => {
    if (inputText.trim().length < 3) {
      setError("Please type at least a few skills (e.g. React, Python, AWS)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/jobs/instant-match', { text: inputText });
      const data = await res.json();
      setMatchResults(data.jobs || []);
      setKeywords(data.keywords || []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (pct: number) => {
    if (pct >= 75) return 'text-green-600 bg-green-50 border-green-200';
    if (pct >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const getMatchBarColor = (pct: number) => {
    if (pct >= 75) return 'bg-green-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-orange-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
      <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Instant Job Match</h3>
              <p className="text-sm text-gray-500">Paste your resume or type your skills — see your top matches in seconds</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Textarea
              placeholder="e.g. .NET developer at Tesla  —  or  —  React, Python, AWS fintech..."
              value={inputText}
              onChange={e => { setInputText(e.target.value); setError(""); }}
              className="flex-1 bg-white border-gray-200 shadow-sm resize-none h-16 text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleMatch(); }
              }}
            />
            <Button
              onClick={handleMatch}
              disabled={loading || inputText.trim().length < 3}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 shadow-md h-16 flex-shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4 mr-1" />Match</>}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="text-xs text-gray-500 self-center">Detected:</span>
              {keywords.slice(0, 10).map((kw, i) => {
                const isCompany = kw.startsWith('company:');
                const isLocation = kw.startsWith('location:');
                const label = isCompany ? kw.replace('company:', '') : isLocation ? kw.replace('location:', '') : kw;
                if (isLocation) return (
                  <Badge key={i} className="text-xs bg-orange-100 text-orange-700 border-orange-200 border">
                    📍 {label}
                  </Badge>
                );
                if (isCompany) return (
                  <Badge key={i} className="text-xs bg-purple-100 text-purple-700 border-purple-200 border">
                    🏢 {label}
                  </Badge>
                );
                return <Badge key={i} variant="secondary" className="text-xs bg-teal-100 text-teal-700">{label}</Badge>;
              })}
              {keywords.length > 10 && (
                <span className="text-xs text-gray-400 self-center">+{keywords.length - 10} more</span>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse border">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && matchResults !== null && matchResults.length === 0 && (
            <div className="text-center py-6 bg-white rounded-lg border">
              <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No strong matches found. Try adding more skills or experience.</p>
            </div>
          )}

          {!loading && matchResults && matchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Top {matchResults.length} matches for you
              </p>
              {matchResults.map((job, i) => (
                <Link key={job.id} href={`/jobs/${job.id}`}>
                  <div className="bg-white rounded-lg p-4 hover:shadow-md transition-all border border-gray-100 cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                          <h4 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">{job.title}</h4>
                          {job.locationMatch && (
                            <Badge className="text-xs bg-orange-100 text-orange-700 border-0 py-0 flex-shrink-0">📍 Near You</Badge>
                          )}
                          {job.companyMatch && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 border-0 py-0 flex-shrink-0">🏢 Client Match</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{job.companyName} · {job.location}</p>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getMatchBarColor(job.matchPct)} transition-all`}
                              style={{ width: `${job.matchPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getMatchColor(job.matchPct)}`}>
                            {job.matchPct}% match
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {job.matchedSkills.map((s, j) => (
                            <Badge key={j} className="text-xs bg-green-100 text-green-700 border-0 py-0">✓ {s}</Badge>
                          ))}
                          {job.missingSkills.map((s, j) => (
                            <Badge key={j} variant="outline" className="text-xs text-gray-400 py-0">missing: {s}</Badge>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
              <div className="text-center pt-1">
                <Link href="/jobs">
                  <Button variant="outline" size="sm" className="text-teal-600 border-teal-300 hover:bg-teal-50">
                    See all matching jobs <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Feature 4: Resume Score Teaser ──────────────────────────────────────────
export function ResumeScoreTeaser() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/user/resume-score-teaser'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/user/resume-score-teaser');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-violet-50 to-purple-50 animate-pulse">
          <CardContent className="p-5">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || data.message) return null;

  const { score, percentile, tips } = data;

  const getScoreColor = (s: number) => {
    if (s >= 75) return 'text-green-600';
    if (s >= 55) return 'text-blue-600';
    return 'text-orange-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Excellent';
    if (s >= 65) return 'Good';
    if (s >= 50) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 h-1.5" />
        <CardContent className="p-5 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-xl shadow">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Your Resume Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
                  <span className="text-gray-400 text-sm">/100</span>
                  <span className={`text-sm font-semibold ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-xs hidden sm:block">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{percentile} for similar roles</span>
                <span>{score}/100</span>
              </div>
              <Progress value={score} className="h-3" />
            </div>

            {tips && tips.length > 0 && (
              <div className="hidden md:flex flex-col gap-1">
                <p className="text-xs font-semibold text-gray-600">Quick wins:</p>
                {tips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-orange-600">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>
            )}

            <Link href="/profile">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white flex-shrink-0">
                Improve Score <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="mt-3 sm:hidden">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{percentile} for similar roles</span>
              <span>{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Feature 3: Job Fit Explainer (for job cards) ─────────────────────────────
interface JobFitExplainerProps {
  jobSkills: string[];
  userSkills: string[];
  jobTitle: string;
}

export function JobFitExplainer({ jobSkills, userSkills, jobTitle }: JobFitExplainerProps) {
  if (!userSkills.length || !jobSkills.length) return null;

  const userSkillsLower = userSkills.map(s => s.toLowerCase());
  const matched = jobSkills.filter(s => userSkillsLower.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u)));
  const missing = jobSkills.filter(s => !userSkillsLower.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u))).slice(0, 2);
  const pct = Math.round((matched.length / jobSkills.length) * 100);

  if (matched.length === 0) return null;

  return (
    <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100 text-xs">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Target className="h-3 w-3 text-blue-600 flex-shrink-0" />
        <span className="font-semibold text-blue-700">
          Why you match: {pct}% skill overlap
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {matched.slice(0, 3).map((s, i) => (
          <Badge key={i} className="text-xs bg-green-100 text-green-700 border-0 py-0">✓ {s}</Badge>
        ))}
        {missing.slice(0, 1).map((s, i) => (
          <Badge key={i} variant="outline" className="text-xs text-gray-400 py-0">missing {s}</Badge>
        ))}
      </div>
    </div>
  );
}

// ─── Feature 5: Smart Connect Hint (for job cards) ───────────────────────────
interface SmartConnectHintProps {
  jobId: number;
  applicationCount?: number;
}

export function SmartConnectHint({ jobId, applicationCount }: SmartConnectHintProps) {
  const { data } = useQuery({
    queryKey: ['/api/jobs', jobId, 'social-hints'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs/${jobId}/social-hints`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!jobId
  });

  const hints: string[] = data?.hints || [];
  if (hints.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-purple-600 mt-1.5">
      <Activity className="h-3 w-3 flex-shrink-0" />
      <span>{hints[0]}</span>
    </div>
  );
}
