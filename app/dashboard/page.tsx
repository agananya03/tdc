'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import clientsData from '@/data/clients.json';
import poolData from '@/data/pool.json';
import { calculateMatchScore } from '@/lib/matchingEngine';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfile } from '@/types';
import { 
  Search, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  MapPin, 
  SlidersHorizontal,
  TrendingUp,
  Heart,
  Users,
  Send,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ClientProfile = UserProfile & {
  journeyStage: 'New' | 'Active' | 'Match Sent' | 'Engaged' | 'Closed';
};

type SortField = 'name' | 'age' | 'city' | 'stage';
type SortOrder = 'asc' | 'desc';

export default function CustomerListPage() {
  const router = useRouter();

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Loading and stats state
  const [isLoading, setIsLoading] = useState(true);
  const [matchesSentCount, setMatchesSentCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Parse clients from JSON
  const clients = clientsData as ClientProfile[];

  // Retrieve matches sent from localStorage
  useEffect(() => {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tdc-sent-')) {
        try {
          const sentList = JSON.parse(localStorage.getItem(key) || '[]');
          count += sentList.length;
        } catch (e) {
          console.error(e);
        }
      }
    }
    setMatchesSentCount(count);
  }, []);

  // Pairings stats calculation
  const pairingsStats = useMemo(() => {
    let totalScoreSum = 0;
    let totalPairsCount = 0;
    let peakScore = -1;
    let bestMatch: { clientName: string; candidateName: string; score: number } | null = null;

    const pool = poolData as UserProfile[];

    for (const client of clients) {
      for (const candidate of pool) {
        const match = calculateMatchScore(client, candidate);
        totalScoreSum += match.score;
        totalPairsCount++;

        if (match.score > peakScore) {
          peakScore = match.score;
          bestMatch = {
            clientName: `${client.firstName} ${client.lastName}`,
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            score: match.score
          };
        }
      }
    }

    const avg = totalPairsCount > 0 ? Math.round(totalScoreSum / totalPairsCount) : 0;
    return {
      avgScore: avg,
      bestMatch
    };
  }, [clients]);

  // Format marital status for display
  const formatMaritalStatus = (status: string): string => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Map stage to styling colors
  const getStageBadgeStyles = (stage: ClientProfile['journeyStage']) => {
    switch (stage) {
      case 'New':
        return 'bg-slate-100 text-slate-700 border-slate-200/50 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/50';
      case 'Active':
        return 'bg-emerald-100/80 text-emerald-800 border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Match Sent':
        return 'bg-amber-100/80 text-amber-800 border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50';
      case 'Engaged':
        return 'bg-pink-100/80 text-pink-800 border-pink-200/50 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800/50';
      case 'Closed':
        return 'bg-rose-100/80 text-rose-800 border-rose-200/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Filter and Sort Logic
  const filteredAndSortedClients = useMemo(() => {
    return clients
      .filter((client) => {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
        const matchesSearch = 
          fullName.includes(query) || 
          client.city.toLowerCase().includes(query);
        
        const matchesGender = 
          selectedGender === 'all' || 
          client.gender === selectedGender;
        
        const matchesStage = 
          selectedStage === 'all' || 
          client.journeyStage === selectedStage;

        return matchesSearch && matchesGender && matchesStage;
      })
      .sort((a, b) => {
        let fieldA: string | number = '';
        let fieldB: string | number = '';

        if (sortField === 'name') {
          fieldA = `${a.firstName} ${a.lastName}`.toLowerCase();
          fieldB = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else if (sortField === 'age') {
          fieldA = a.age;
          fieldB = b.age;
        } else if (sortField === 'city') {
          fieldA = a.city.toLowerCase();
          fieldB = b.city.toLowerCase();
        } else if (sortField === 'stage') {
          fieldA = a.journeyStage;
          fieldB = b.journeyStage;
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [clients, searchQuery, selectedGender, selectedStage, sortField, sortOrder]);

  // Handle Sort Change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Stats summaries
  const stageStats = useMemo(() => {
    const stats = { Total: clients.length, New: 0, Active: 0, MatchSent: 0, Engaged: 0, Closed: 0 };
    clients.forEach((c) => {
      if (c.journeyStage === 'New') stats.New++;
      else if (c.journeyStage === 'Active') stats.Active++;
      else if (c.journeyStage === 'Match Sent') stats.MatchSent++;
      else if (c.journeyStage === 'Engaged') stats.Engaged++;
      else if (c.journeyStage === 'Closed') stats.Closed++;
    });
    return stats;
  }, [clients]);

  // Reset Filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGender('all');
    setSelectedStage('all');
    setSortField('name');
    setSortOrder('asc');
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Stats Panel */}
      {isLoading ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {/* Card 1: Total Clients */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex justify-between items-start hover:border-primary/20 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Clients</span>
              <h3 className="text-2xl font-serif font-bold text-foreground">{clients.length}</h3>
              <span className="text-[10px] text-muted-foreground font-medium block pt-1">Registered clients in database</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Users className="size-4.5" />
            </div>
          </div>

          {/* Card 2: Matches Sent */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex justify-between items-start hover:border-primary/20 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Matches Sent (Month)</span>
              <h3 className="text-2xl font-serif font-bold text-foreground">{matchesSentCount}</h3>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 pt-1">
                <TrendingUp className="size-3" /> Real-time activity count
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Send className="size-4.5" />
            </div>
          </div>

          {/* Card 3: Avg Match Score */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex justify-between items-start hover:border-primary/20 transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Avg Match Score</span>
              <h3 className="text-2xl font-serif font-bold text-foreground">{pairingsStats.avgScore}%</h3>
              <span className="text-[10px] text-muted-foreground font-medium block pt-1">Average compatibility level</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Heart className="size-4.5 fill-primary/15" />
            </div>
          </div>

          {/* Card 4: Best Pair */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex justify-between items-start hover:border-primary/20 transition-all col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Highest Compatibility</span>
              <h3 className="text-base font-serif font-bold text-foreground truncate pt-0.5">
                {pairingsStats.bestMatch ? `${pairingsStats.bestMatch.clientName.split(' ')[0]} & ${pairingsStats.bestMatch.candidateName.split(' ')[0]}` : 'N/A'}
              </h3>
              <span className="text-[10px] text-primary font-bold flex items-center gap-0.5 pt-1">
                <Star className="size-3 fill-primary/10" /> Peak compatibility: {pairingsStats.bestMatch?.score}%
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <Star className="size-4.5 fill-amber-500/10" />
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setSelectedStage('all')}
          className={`cursor-pointer bg-card border rounded-xl p-3 shadow-2xs hover:border-primary/20 transition-all text-center ${selectedStage === 'all' ? 'border-primary ring-2 ring-primary/10' : 'border-border/80'}`}
        >
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">All Clients</span>
          <span className="text-xl font-serif font-bold text-foreground mt-1 block">{stageStats.Total}</span>
        </div>
        <div 
          onClick={() => setSelectedStage('New')}
          className={`cursor-pointer bg-card border rounded-xl p-3 shadow-2xs hover:border-primary/20 transition-all text-center ${selectedStage === 'New' ? 'border-primary ring-2 ring-primary/10' : 'border-border/80'}`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">New</span>
          <span className="text-xl font-serif font-bold text-slate-700 mt-1 block">{stageStats.New}</span>
        </div>
        <div 
          onClick={() => setSelectedStage('Active')}
          className={`cursor-pointer bg-card border rounded-xl p-3 shadow-2xs hover:border-primary/20 transition-all text-center ${selectedStage === 'Active' ? 'border-primary ring-2 ring-primary/10' : 'border-border/80'}`}
        >
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active</span>
          <span className="text-xl font-serif font-bold text-emerald-700 mt-1 block">{stageStats.Active}</span>
        </div>
        <div 
          onClick={() => setSelectedStage('Match Sent')}
          className={`cursor-pointer bg-card border rounded-xl p-3 shadow-2xs hover:border-primary/20 transition-all text-center ${selectedStage === 'Match Sent' ? 'border-primary ring-2 ring-primary/10' : 'border-border/80'}`}
        >
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Match Sent</span>
          <span className="text-xl font-serif font-bold text-amber-700 mt-1 block">{stageStats.MatchSent}</span>
        </div>
        <div 
          onClick={() => setSelectedStage('Engaged')}
          className={`cursor-pointer bg-card border rounded-xl p-3 shadow-2xs hover:border-primary/20 transition-all text-center ${selectedStage === 'Engaged' ? 'border-primary ring-2 ring-primary/10' : 'border-border/80'}`}
        >
          <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">Engaged</span>
          <span className="text-xl font-serif font-bold text-pink-700 mt-1 block">{stageStats.Engaged}</span>
        </div>
        <div 
          onClick={() => setSelectedStage('Closed')}
          className={`cursor-pointer bg-card border rounded-xl p-3 shadow-2xs hover:border-primary/20 transition-all text-center ${selectedStage === 'Closed' ? 'border-primary ring-2 ring-primary/10' : 'border-border/80'}`}
        >
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Closed</span>
          <span className="text-xl font-serif font-bold text-rose-700 mt-1 block">{stageStats.Closed}</span>
        </div>
      </section>

      {/* Directory Management Controls */}
      <section className="bg-card border border-border/80 rounded-2xl p-4 md:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-4.5 text-muted-foreground" />
            </span>
            <input
              type="text"
              placeholder="Search clients by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border/85 rounded-xl bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Filters, sorting & View toggles */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Gender Filter */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5 text-muted-foreground" />
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="bg-background border border-border/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Stage Filter */}
            <div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-background border border-border/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="all">All Stages</option>
                <option value="New">Stage: New</option>
                <option value="Active">Stage: Active</option>
                <option value="Match Sent">Stage: Match Sent</option>
                <option value="Engaged">Stage: Engaged</option>
                <option value="Closed">Stage: Closed</option>
              </select>
            </div>

            {/* Mobile/Card Sort Select (Only visible or active when not in headers) */}
            <div className="block lg:hidden">
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field as SortField);
                  setSortOrder(order as SortOrder);
                }}
                className="bg-background border border-border/85 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="age-asc">Age (Youngest first)</option>
                <option value="age-desc">Age (Oldest first)</option>
                <option value="city-asc">City (A-Z)</option>
                <option value="city-desc">City (Z-A)</option>
              </select>
            </div>

            <div className="h-6 w-px bg-border/80 hidden sm:block" />

            {/* View Mode Toggle */}
            <div className="bg-secondary/50 rounded-xl p-0.5 flex items-center border border-border/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-card text-primary shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-card text-primary shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table View"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Summary & Reset */}
        {(searchQuery || selectedGender !== 'all' || selectedStage !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs font-medium text-muted-foreground">
            <div>
              Showing {filteredAndSortedClients.length} of {clients.length} clients matching filters.
            </div>
            <button
              onClick={handleClearFilters}
              className="text-primary hover:underline font-semibold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </section>

      {/* Grid or Table Container */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          viewMode === 'grid' ? (
            <motion.div
              key="grid-skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card border border-border/80 rounded-2xl p-4 shadow-3xs space-y-4">
                  <div className="flex gap-4">
                    <Skeleton className="size-14 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1 pt-1">
                      <Skeleton className="h-4.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-2.5 w-5/6" />
                    </div>
                  </div>
                  <Skeleton className="h-px w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-px w-full" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="table-skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card border border-border/80 rounded-2xl shadow-3xs overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-secondary/45 border-b border-border/80">
                      <th className="px-5 py-3.5"><Skeleton className="h-3.5 w-28" /></th>
                      <th className="px-5 py-3.5"><Skeleton className="h-3.5 w-12" /></th>
                      <th className="px-5 py-3.5"><Skeleton className="h-3.5 w-20" /></th>
                      <th className="px-5 py-3.5"><Skeleton className="h-3.5 w-24" /></th>
                      <th className="px-5 py-3.5"><Skeleton className="h-3.5 w-28" /></th>
                      <th className="px-5 py-3.5"><Skeleton className="h-3.5 w-20" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-9.5 rounded-full shrink-0" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-5 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )
        ) : filteredAndSortedClients.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-3xs"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-2">
              <Search className="size-7" />
            </div>
            <h3 className="font-serif font-bold text-lg text-foreground">No Clients Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-normal">
              We couldn&apos;t find any matches for your query. Try adjusting your search keywords, gender criteria, or journey stage filter.
            </p>
            <button
              onClick={handleClearFilters}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors"
            >
              Reset Search & Filters
            </button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          // GRID VIEW
          <motion.div
            key="grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filteredAndSortedClients.map((client) => {
              const fullName = `${client.firstName} ${client.lastName}`;
              return (
                <motion.div
                  key={client.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => router.push(`/dashboard/client/${client.id}`)}
                  className="bg-card border border-border/80 hover:border-primary/25 rounded-2xl p-4 shadow-3xs hover:shadow-xs cursor-pointer flex flex-col justify-between gap-4 transition-all relative overflow-hidden group"
                >
                  {/* Card Header Profile Info */}
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="relative size-14 rounded-full overflow-hidden border-2 border-border/60 shrink-0 group-hover:border-primary/20 transition-all bg-secondary">
                      {client.photo ? (
                        <Image
                          src={client.photo}
                          alt={fullName}
                          fill
                          sizes="56px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-serif font-bold text-lg">
                          {client.firstName.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Basic info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {fullName}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                        <span>{client.gender.charAt(0).toUpperCase() + client.gender.slice(1)}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{client.age} yrs</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 font-medium truncate mt-1">
                        {client.designation} at {client.currentCompany}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-border/50" />

                  {/* Card Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider block">City</span>
                      <span className="text-foreground truncate block flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground shrink-0" />
                        {client.city}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider block">Marital Status</span>
                      <span className="text-foreground truncate block">
                        {formatMaritalStatus(client.maritalStatus)}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Status Badge */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1">
                    <span className="text-[10px] text-muted-foreground/75 font-semibold">
                      {client.religion} · {client.caste}
                    </span>
                    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getStageBadgeStyles(client.journeyStage)}`}>
                      {client.journeyStage}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          // TABLE VIEW
          <motion.div
            key="table-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border/80 rounded-2xl shadow-3xs overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-secondary/45 border-b border-border/80 select-none">
                    <th 
                      onClick={() => handleSort('name')}
                      className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Client Details
                        {sortField === 'name' ? (
                          sortOrder === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('age')}
                      className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Age
                        {sortField === 'age' ? (
                          sortOrder === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('city')}
                      className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Location
                        {sortField === 'city' ? (
                          sortOrder === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Marital Status
                    </th>
                    <th className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Caste / Religion
                    </th>
                    <th 
                      onClick={() => handleSort('stage')}
                      className="px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Journey Stage
                        {sortField === 'stage' ? (
                          sortOrder === 'asc' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredAndSortedClients.map((client) => {
                    const fullName = `${client.firstName} ${client.lastName}`;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => router.push(`/dashboard/client/${client.id}`)}
                        className="hover:bg-secondary/20 cursor-pointer transition-colors group"
                      >
                        {/* Name & Avatar */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative size-9.5 rounded-full overflow-hidden border border-border bg-secondary shrink-0 group-hover:border-primary/20 transition-all">
                              {client.photo ? (
                                <Image
                                  src={client.photo}
                                  alt={fullName}
                                  fill
                                  sizes="38px"
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-serif font-bold text-sm">
                                  {client.firstName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-sm font-serif font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                {fullName}
                              </span>
                              <span className="block text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                                {client.designation} at {client.currentCompany}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Age & Gender */}
                        <td className="px-5 py-4 text-sm font-medium text-foreground">
                          <div className="flex flex-col">
                            <span>{client.age} years</span>
                            <span className="text-[10px] text-muted-foreground font-semibold capitalize mt-0.5">
                              {client.gender}
                            </span>
                          </div>
                        </td>

                        {/* City / Location */}
                        <td className="px-5 py-4 text-sm font-medium text-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            {client.city}
                          </span>
                        </td>

                        {/* Marital Status */}
                        <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">
                          <span className="text-foreground">
                            {formatMaritalStatus(client.maritalStatus)}
                          </span>
                        </td>

                        {/* Caste / Religion */}
                        <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-foreground">{client.caste}</span>
                            <span className="text-[10px] font-medium text-muted-foreground/85 mt-0.5">{client.religion}</span>
                          </div>
                        </td>

                        {/* Stage Badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStageBadgeStyles(client.journeyStage)}`}>
                            {client.journeyStage}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
