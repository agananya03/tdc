'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import clientsData from '@/data/clients.json';
import poolData from '@/data/pool.json';
import { getTopMatches, calculateMatchScore } from '@/lib/matchingEngine';
import { useAuth } from '@/lib/store';
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Briefcase, 
  Home, 
  Compass, 
  FileText, 
  BookmarkCheck,
  Send,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  Mail,
  Loader2,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, MatchScore, MatchFactorBreakdown } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

type TabType = 'personal' | 'professional' | 'family' | 'preferences' | 'matches';

interface NoteItem {
  id: string;
  text: string;
  timestamp: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  
  // Get current logged-in matchmaker
  const { user: matchmaker } = useAuth();

  // Tabs & Lists States
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Matchmaking States
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [expandedMatches, setExpandedMatches] = useState<{ [key: string]: boolean }>({});
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [sentMatchIds, setSentMatchIds] = useState<string[]>([]);

  // Loading states
  const [pageLoading, setPageLoading] = useState(true);
  const [isCalculatingMatches, setIsCalculatingMatches] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);
  
  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Insight States (keyed by candidate ID)
  const [aiInsights, setAiInsights] = useState<{ [candidateId: string]: string }>({});
  const [aiLoading, setAiLoading] = useState<{ [candidateId: string]: boolean }>({});
  const [aiError, setAiError] = useState<{ [candidateId: string]: string | null }>({});
  const [expandedAiInsights, setExpandedAiInsights] = useState<{ [candidateId: string]: boolean }>({});

  // AI Email Draft States (inside the modal)
  const [emailDraft, setEmailDraft] = useState('');
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [emailDraftError, setEmailDraftError] = useState<string | null>(null);
  const [showEmailDraft, setShowEmailDraft] = useState(false);

  // Find client
  const client = useMemo(() => {
    return (clientsData as UserProfile[]).find(c => c.id === id);
  }, [id]);

  // Load persistent notes & sent matches from localStorage
  useEffect(() => {
    if (id) {
      // Load Notes
      const storedNotes = localStorage.getItem(`tdc-notes-${id}`);
      if (storedNotes) {
        try { setNotes(JSON.parse(storedNotes)); } catch (e) { console.error(e); }
      }
      // Load Sent Matches
      const storedSent = localStorage.getItem(`tdc-sent-${id}`);
      if (storedSent) {
        try { setSentMatchIds(JSON.parse(storedSent)); } catch (e) { console.error(e); }
      }
    }
  }, [id]);

  // Save Notes to localStorage
  const saveNotes = (updatedNotes: NoteItem[]) => {
    setNotes(updatedNotes);
    localStorage.setItem(`tdc-notes-${id}`, JSON.stringify(updatedNotes));
  };

  // Add Note Handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      timestamp: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    };

    saveNotes([newNote, ...notes]);
    setNewNoteText('');
  };

  // Delete Note Handler
  const handleDeleteNote = (noteId: string) => {
    saveNotes(notes.filter(n => n.id !== noteId));
  };

  // Run Matchmaker Algorithm
  const handleFindMatches = () => {
    if (!client) return;
    setIsCalculatingMatches(true);
    setHasCalculated(true);
    setTimeout(() => {
      const pool = poolData as UserProfile[];
      const topMatches = getTopMatches(client, pool, 10);
      setMatches(topMatches);
      setIsCalculatingMatches(false);
    }, 800); // Simulate network calculation latency
  };

  // Toggle category breakdown visibility on cards
  const toggleBreakdown = (candidateId: string) => {
    setExpandedMatches(prev => ({
      ...prev,
      [candidateId]: !prev[candidateId]
    }));
  };

  // Stream AI Insight for a candidate
  const handleGetAiInsight = async (candidate: UserProfile) => {
    if (!client) return;

    // Toggle panel visibility if already fetched
    if (aiInsights[candidate.id]) {
      setExpandedAiInsights(prev => ({
        ...prev,
        [candidate.id]: !prev[candidate.id]
      }));
      return;
    }

    setAiLoading(prev => ({ ...prev, [candidate.id]: true }));
    setAiError(prev => ({ ...prev, [candidate.id]: null }));
    setExpandedAiInsights(prev => ({ ...prev, [candidate.id]: true }));

    try {
      const response = await fetch('/api/ai/match-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, candidate })
      });

      if (!response.ok) {
        throw new Error('Failed to generate matchmaking insights.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          textBuffer += chunk;

          setAiInsights(prev => ({
            ...prev,
            [candidate.id]: textBuffer
          }));
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error occurred while streaming AI insights.';
      setAiError(prev => ({
        ...prev,
        [candidate.id]: errorMessage
      }));
    } finally {
      setAiLoading(prev => ({ ...prev, [candidate.id]: false }));
    }
  };

  // Modal open triggers
  const handleOpenSendModal = (candidate: UserProfile) => {
    setSelectedCandidate(candidate);
    setShowEmailDraft(false);
    setEmailDraft('');
    setEmailDraftError(null);
  };

  // Stream AI Introduction Email Draft
  const handleDraftIntroEmail = async () => {
    if (!client || !selectedCandidate) return;

    setIsDraftingEmail(true);
    setEmailDraftError(null);
    setShowEmailDraft(true);
    setEmailDraft('');

    try {
      const response = await fetch('/api/ai/intro-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchmaker,
          client,
          candidate: selectedCandidate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to draft the intro email.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          textBuffer += chunk;
          setEmailDraft(textBuffer);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error occurred while drafting email.';
      setEmailDraftError(errorMessage);
    } finally {
      setIsDraftingEmail(false);
    }
  };

  // Trigger Send Match workflow
  const handleConfirmSendMatch = () => {
    if (!client || !selectedCandidate) return;

    // Save sent match in list
    const updatedSentIds = [...sentMatchIds, selectedCandidate.id];
    setSentMatchIds(updatedSentIds);
    localStorage.setItem(`tdc-sent-${client.id}`, JSON.stringify(updatedSentIds));

    // Optional: save draft email in notes
    if (emailDraft.trim()) {
      const emailNote: NoteItem = {
        id: `note-email-${Date.now()}`,
        text: `Match dispatch email draft sent to ${client.firstName}:\n\n${emailDraft}`,
        timestamp: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      };
      saveNotes([emailNote, ...notes]);
    }

    // Show Toast
    setToastMessage(`Match sent to ${client.firstName}! Email notification triggered.`);

    // Close Modal
    setSelectedCandidate(null);
  };

  // Auto-hide toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Format income helper
  const formatIncome = (income: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(income) + ' p.a.';
  };

  // Format Tier text & badge style
  const getTierDetails = (tier: string) => {
    switch (tier) {
      case 'High Potential':
        return { style: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50', label: 'High Potential' };
      case 'Good Match':
        return { style: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50', label: 'Good Match' };
      default:
        return { style: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/50', label: 'Potential Match' };
    }
  };

  const getStageBadgeStyles = (stage: string) => {
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

  if (pageLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn font-sans p-2">
        {/* Back link skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>

        {/* Hero Card Skeleton */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 flex flex-col md:flex-row gap-6">
          <Skeleton className="w-24 h-24 rounded-full shrink-0 mx-auto md:mx-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="flex gap-2 justify-center md:justify-start items-center">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-2 justify-center md:justify-start">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-3.5 w-36 mx-auto md:mx-0" />
          </div>
          <div className="border border-border/50 rounded-xl p-3 w-full md:max-w-xs space-y-2.5 bg-secondary/15">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>

        {/* Tabs Bar Skeleton */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 flex gap-4 overflow-x-auto">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg shrink-0" />
          ))}
        </div>

        {/* Info Grid Skeleton */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-secondary/20 p-3 rounded-xl border border-border/30 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-3xs">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
          <BookmarkCheck className="size-7" />
        </div>
        <h3 className="font-serif font-bold text-lg text-foreground">Client Profile Not Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-normal">
          We couldn&apos;t find any client matching ID &ldquo;{id}&rdquo;.
        </p>
        <Link
          href="/dashboard"
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const fullName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-55 bg-emerald-600 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-500/20 text-xs tracking-wide pointer-events-none"
          >
            <CheckCircle className="size-4.5 text-white animate-bounce" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard" 
          className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="size-4" /> BACK TO DIRECTORY
        </Link>
        <span className="text-[10px] text-muted-foreground font-semibold">
          Client ID: <span className="font-mono text-foreground">{client.id}</span>
        </span>
      </div>

      {/* HERO SECTION */}
      <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-2xs relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 mx-auto md:mx-0 bg-secondary">
          {client.photo ? (
            <Image
              src={client.photo}
              alt={fullName}
              fill
              sizes="96px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-serif font-bold text-2xl">
              {client.firstName.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
            <h1 className="font-serif font-bold text-2xl text-foreground">{fullName}</h1>
            <span className={`w-fit mx-auto md:mx-0 text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStageBadgeStyles(client.journeyStage || 'New')}`}>
              {client.journeyStage}
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-semibold flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
            <span className="capitalize">{client.gender}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{client.age} years old</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              <MapPin className="size-3 text-muted-foreground" />
              {client.city}, {client.country}
            </span>
          </p>

          <p className="text-[11px] text-muted-foreground/80 font-medium pt-1">
            {client.designation} at {client.currentCompany}
          </p>
        </div>

        <div className="border border-border/50 rounded-xl p-3 bg-secondary/20 text-xs font-semibold space-y-1 md:max-w-xs w-full">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="text-foreground truncate pl-2">{client.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone:</span>
            <span className="text-foreground">{client.phone}</span>
          </div>
        </div>
      </section>

      {/* TABS CONTAINER */}
      <section className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        {/* Tabs Bar */}
        <div className="bg-secondary/35 border-b border-border/80 flex overflow-x-auto">
          {[
            { id: 'personal', label: 'Personal', icon: User },
            { id: 'professional', label: 'Professional', icon: Briefcase },
            { id: 'family', label: 'Family', icon: Home },
            { id: 'preferences', label: 'Preferences', icon: Compass },
            { id: 'matches', label: 'Matches', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-primary text-primary bg-card'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* TAB 1: PERSONAL */}
              {activeTab === 'personal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date of Birth</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.dateOfBirth}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Height</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.height} cm</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Complexion</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block capitalize">{client.complexion}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Religion</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.religion}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Caste</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.caste}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Gotra</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.gotra}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Manglik Status</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.manglik}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Mother Tongue</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.motherTongue}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Diet</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.diet}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Smoking</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.smoking}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Drinking</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.drinking}</span>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFESSIONAL */}
              {activeTab === 'professional' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Company</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.currentCompany}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Designation</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.designation}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Annual Income</span>
                    <span className="text-sm font-serif font-bold text-primary mt-0.5 block">{formatIncome(client.income)}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Undergraduate Education</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.undergraduateCollege}</span>
                  </div>
                  {client.postGraduation && client.postGraduation !== 'None' && (
                    <div className="bg-secondary/20 p-3 rounded-xl border border-border/30 sm:col-span-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Post Graduation / Specialization</span>
                      <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.postGraduation}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FAMILY */}
              {activeTab === 'family' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Family Type</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block capitalize">{client.familyType}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Siblings</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.siblings} sibling(s)</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30 sm:col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Languages Known</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">
                      {client.languagesKnown && client.languagesKnown.length > 0 
                        ? client.languagesKnown.join(', ') 
                        : 'English'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: PREFERENCES */}
              {activeTab === 'preferences' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Want Kids</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.wantKids}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Open to Relocate</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.openToRelocate}</span>
                  </div>
                  <div className="bg-secondary/20 p-3 rounded-xl border border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Open to Pets</span>
                    <span className="text-sm font-semibold text-foreground mt-0.5 block">{client.openToPets}</span>
                  </div>
                </div>
              )}

              {/* TAB 5: MATCHES SECTION */}
              {activeTab === 'matches' && (
                <div className="space-y-6">
                  {/* Find Matches Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-accent/40 rounded-2xl p-5 border border-border/60">
                    <div className="space-y-1 text-center sm:text-left">
                      <h4 className="text-sm font-serif font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                        <Sparkles className="size-4.5 text-primary" /> Matching Engine Pool
                      </h4>
                      <p className="text-xs text-muted-foreground leading-normal max-w-md">
                        Run the matching engine algorithm to score and sort candidates from the pool based on demographic, economic, and lifestyle filters.
                      </p>
                    </div>
                    <button
                      onClick={handleFindMatches}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-primary/10 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="size-4 animate-spin-slow" /> Find Matches
                    </button>
                  </div>

                  {/* Matches Display */}
                  <AnimatePresence mode="wait">
                    {isCalculatingMatches ? (
                      <motion.div
                        key="matches-skeletons"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-5"
                      >
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-3xs animate-fadeIn">
                            <div className="flex gap-4">
                              <Skeleton className="size-14 rounded-full shrink-0" />
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <Skeleton className="h-5 w-32" />
                                  <Skeleton className="h-5.5 w-10" />
                                </div>
                                <Skeleton className="h-3.5 w-20" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                            <Skeleton className="h-px w-full" />
                            <div className="flex justify-between items-center pt-1">
                              <Skeleton className="h-5 w-24 rounded-full" />
                              <div className="flex gap-2">
                                <Skeleton className="h-7 w-16 rounded-lg" />
                                <Skeleton className="h-7 w-16 rounded-lg" />
                                <Skeleton className="h-7 w-20 rounded-lg" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    ) : !hasCalculated ? (
                      <motion.div 
                        key="matches-initial"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12 px-4 bg-secondary/15 rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center space-y-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground/60">
                          <Sparkles className="size-6 text-muted-foreground/50 animate-pulse" />
                        </div>
                        <h5 className="text-xs font-bold text-foreground">Matrimonial Engine Ready</h5>
                        <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
                          Run the recommendation score calculations against the pool of 100 candidates to identify high-compatibility partners.
                        </p>
                        <button
                          onClick={handleFindMatches}
                          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-1.5 rounded-xl text-[10px] shadow-xs transition-colors"
                        >
                          Calculate Compatibility
                        </button>
                      </motion.div>
                    ) : matches.length === 0 ? (
                      <motion.div 
                        key="matches-empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-12 px-4 bg-secondary/15 rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center space-y-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground/60">
                          <Heart className="size-6 text-muted-foreground/50" />
                        </div>
                        <h5 className="text-xs font-bold text-foreground">No Compatible Matches Found</h5>
                        <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
                          There are no candidates in the matching pool who meet the criteria for this client. Try adjusting criteria in matchingEngine.ts.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-5"
                      >
                        {matches.map((matchScore) => {
                          const candidate = matchScore.candidate;
                          if (!candidate) return null;
                          const isSent = sentMatchIds.includes(candidate.id);
                          const { style: badgeStyle, label: tierLabel } = getTierDetails(matchScore.tier);
                          const isExpanded = expandedMatches[candidate.id] || false;
                          const isAiExpanded = expandedAiInsights[candidate.id] || false;
                          const candidateFullName = `${candidate.firstName} ${candidate.lastName}`;

                          return (
                            <motion.div
                              key={candidate.id}
                              className={`bg-card border rounded-2xl p-5 shadow-3xs flex flex-col justify-between gap-4 relative overflow-hidden transition-all ${isSent ? 'border-emerald-500/35 ring-1 ring-emerald-500/5 bg-emerald-500/1' : 'border-border/80'}`}
                            >
                              {/* Header Card */}
                              <div className="flex gap-4">
                                {/* Photo */}
                                <div className="relative size-14 rounded-full overflow-hidden border border-border/80 shrink-0 bg-secondary">
                                  {candidate.photo ? (
                                    <Image
                                      src={candidate.photo}
                                      alt={candidateFullName}
                                      fill
                                      sizes="56px"
                                      unoptimized
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-serif font-bold text-lg">
                                      {candidate.firstName.charAt(0)}
                                    </div>
                                  )}
                                </div>

                                {/* Candidate Meta */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <h4 className="font-serif font-bold text-base text-foreground truncate">
                                      {candidateFullName}
                                    </h4>
                                    
                                    {/* Large Score Indicator */}
                                    <span className="text-xl font-serif font-bold text-primary shrink-0">
                                      {matchScore.score}%
                                    </span>
                                  </div>

                                  <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                                    <span>{candidate.age} yrs</span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>{candidate.city}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {candidate.designation} at {candidate.currentCompany}
                                  </p>
                                </div>
                              </div>

                              {/* Action Bar / Status */}
                              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/40 mt-1 gap-2">
                                <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                                  {tierLabel}
                                </span>

                                <div className="flex items-center gap-2">
                                  {/* AI Insight Trigger */}
                                  <button
                                    onClick={() => handleGetAiInsight(candidate)}
                                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold ${
                                      isAiExpanded
                                        ? 'bg-primary/10 text-primary border-primary/30'
                                        : 'border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Get AI compatibility summary"
                                  >
                                    <Sparkles className={`size-3.5 ${aiLoading[candidate.id] ? 'animate-spin' : ''}`} />
                                    AI Insight
                                  </button>

                                  {/* Toggle Breakdown Button */}
                                  <button
                                    onClick={() => toggleBreakdown(candidate.id)}
                                    className="p-1 rounded-lg border border-border/60 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-[10px] font-bold"
                                    title="View compatibility breakdown"
                                  >
                                    Breakdown {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                  </button>

                                  {/* Send Match Button */}
                                  <button
                                    onClick={() => handleOpenSendModal(candidate)}
                                    disabled={isSent}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                                      isSent 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/50 cursor-default opacity-85'
                                        : 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-2xs cursor-pointer'
                                    }`}
                                  >
                                    {isSent ? 'Match Sent' : 'Send Match'}
                                  </button>
                                </div>
                              </div>

                              {/* Collapsible Breakdown Lists */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-secondary/20 rounded-xl p-3 border border-border/50 space-y-2.5 text-[11px] font-medium"
                                  >
                                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Breakdown Analysis</h5>
                                    {Object.entries(matchScore.breakdown).map(([category, details]: [string, MatchFactorBreakdown]) => {
                                      const percent = (details.score / details.max) * 100;
                                      return (
                                        <div key={category} className="space-y-1">
                                          <div className="flex justify-between font-bold text-xs text-foreground/90 capitalize">
                                            <span>{category}</span>
                                            <span>{details.score} / {details.max} pts</span>
                                          </div>
                                          {/* Mini progress bar */}
                                          <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-300 ${
                                                percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-slate-400'
                                              }`} 
                                              style={{ width: `${percent}%` }}
                                            />
                                          </div>
                                          <p className="text-[10px] text-muted-foreground leading-normal italic mt-0.5">
                                            {details.reason}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* COLLAPSIBLE AI INSIGHT PANEL */}
                              <AnimatePresence initial={false}>
                                {isAiExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-primary/5 rounded-xl p-3.5 border border-primary/20 space-y-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between text-[9px] text-primary font-bold uppercase tracking-wider pb-1.5 border-b border-primary/10">
                                      <span className="flex items-center gap-1">
                                        <Sparkles className="size-3 text-primary animate-pulse" />
                                        Matrimonial AI Compatibility Insight
                                      </span>
                                      <span className="opacity-80">Powered by Claude</span>
                                    </div>

                                    {/* Streaming / Typing Indicator */}
                                    {aiLoading[candidate.id] && !aiInsights[candidate.id] ? (
                                      <div className="flex items-center gap-2 py-3 text-muted-foreground italic font-medium">
                                        <Loader2 className="size-4 animate-spin text-primary" />
                                        <span>Analyzing matrimonial compatibility factors...</span>
                                      </div>
                                    ) : aiError[candidate.id] ? (
                                      <div className="text-destructive font-medium py-1.5">
                                        {aiError[candidate.id]}
                                      </div>
                                    ) : (
                                      <div className="space-y-2 text-foreground/95 leading-relaxed font-medium pt-1">
                                        <p className="whitespace-pre-line">{aiInsights[candidate.id]}</p>
                                        {aiLoading[candidate.id] && (
                                          <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse ml-0.5 align-middle" />
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* PERSISTENT NOTES SECTION */}
      <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-2xs space-y-6">
        <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
          <FileText className="size-5 text-primary" /> Internal Matchmaker Notes
        </h3>

        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            placeholder="Type a new consult log or matching update for this client..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            rows={3}
            className="w-full border border-border/85 rounded-xl bg-background p-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newNoteText.trim()}
              className="bg-primary hover:bg-primary/95 disabled:opacity-40 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="size-3.5" /> Save Note
            </button>
          </div>
        </form>

        <div className="space-y-3 mt-4">
          <AnimatePresence initial={false}>
            {notes.length === 0 ? (
              <motion.div
                key="notes-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 px-4 bg-secondary/15 rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground/60">
                  <FileText className="size-6 text-muted-foreground/50" />
                </div>
                <h5 className="text-xs font-bold text-foreground">No Notes Logged Yet</h5>
                <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
                  Log consultation updates, client feedback, or matchmaking preferences to maintain a consult timeline.
                </p>
              </motion.div>
            ) : (
              notes.map((note) => (
                <motion.div 
                  key={note.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-secondary/35 border border-border/50 rounded-xl p-3.5 text-xs flex justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                      <span>Matchmaker Consult Log</span>
                      <span>•</span>
                      <span>{note.timestamp}</span>
                    </div>
                    <p className="text-foreground leading-normal font-medium whitespace-pre-wrap">{note.text}</p>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive self-start transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Note"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* SIDE BY SIDE VERIFICATION MODAL OVERLAY */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              className="absolute inset-0 bg-foreground/20 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-3xl bg-card border border-border/80 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] z-10 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-serif font-bold text-lg text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-5 text-primary" /> Verify Match Compatibility
                </h3>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* SIDE-BY-SIDE PANELS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-border/65">
                
                {/* Left Profile Panel (Client) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 rounded-full overflow-hidden border border-primary/20 bg-secondary">
                      {client.photo ? (
                        <Image
                          src={client.photo}
                          alt={fullName}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-serif font-bold text-sm">
                          {client.firstName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">CLIENT (MALE)</span>
                      <h4 className="font-serif font-bold text-base text-foreground">{fullName}</h4>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Age / City</span>
                      <span className="text-foreground">{client.age} yrs / {client.city}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Education</span>
                      <span className="text-foreground truncate max-w-[180px]">{client.undergraduateCollege}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Profession</span>
                      <span className="text-foreground truncate max-w-[180px]">{client.designation}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Annual Income</span>
                      <span className="text-foreground">{formatIncome(client.income)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Gotra / Caste</span>
                      <span className="text-foreground">{client.gotra} / {client.caste}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Diet Preference</span>
                      <span className="text-foreground">{client.diet}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Relocation Option</span>
                      <span className="text-foreground">{client.openToRelocate}</span>
                    </div>
                  </div>
                </div>

                {/* Right Profile Panel (Candidate) */}
                <div className="space-y-4 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 rounded-full overflow-hidden border border-primary/20 bg-secondary">
                      {selectedCandidate.photo ? (
                        <Image
                          src={selectedCandidate.photo}
                          alt={`${selectedCandidate.firstName} ${selectedCandidate.lastName}`}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-serif font-bold text-sm">
                          {selectedCandidate.firstName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">CANDIDATE (FEMALE)</span>
                      <h4 className="font-serif font-bold text-base text-foreground">
                        {selectedCandidate.firstName} {selectedCandidate.lastName}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Age / City</span>
                      <span className="text-foreground">{selectedCandidate.age} yrs / {selectedCandidate.city}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Education</span>
                      <span className="text-foreground truncate max-w-[180px]">{selectedCandidate.undergraduateCollege}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Profession</span>
                      <span className="text-foreground truncate max-w-[180px]">{selectedCandidate.designation}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Annual Income</span>
                      <span className="text-foreground">{formatIncome(selectedCandidate.income)}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Gotra / Caste</span>
                      <span className="text-foreground">{selectedCandidate.gotra} / {selectedCandidate.caste}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Diet Preference</span>
                      <span className="text-foreground">{selectedCandidate.diet}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-border/30">
                      <span className="text-muted-foreground">Relocation Option</span>
                      <span className="text-foreground">{selectedCandidate.openToRelocate}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Score summary panel inside modal */}
              <div className="bg-accent/40 rounded-2xl p-4 border border-border/60 flex items-center justify-between text-xs font-semibold">
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Overall Compatibility Match Score</span>
                  <span className="text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="text-primary text-base font-bold font-serif">{calculateMatchScore(client, selectedCandidate).score}%</span>
                    <span>•</span>
                    <span className="text-muted-foreground capitalize font-bold">{calculateMatchScore(client, selectedCandidate).tier}</span>
                  </span>
                </div>
                {/* AI Email Draft Trigger */}
                <button
                  onClick={handleDraftIntroEmail}
                  disabled={isDraftingEmail}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary font-bold border border-primary/20 rounded-xl transition-all flex items-center gap-1.5"
                >
                  {isDraftingEmail ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Drafting...
                    </>
                  ) : (
                    <>
                      <Mail className="size-3.5" />
                      Draft intro email with AI
                    </>
                  )}
                </button>
              </div>

              {/* DRAFT EMAIL WRAPPER */}
              <AnimatePresence>
                {showEmailDraft && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <span>Email Introduction Draft</span>
                      <span>Powered by Claude</span>
                    </div>
                    
                    {emailDraftError ? (
                      <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                        {emailDraftError}
                      </div>
                    ) : (
                      <div className="relative">
                        <textarea
                          rows={6}
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          placeholder="Drafting match email..."
                          disabled={isDraftingEmail}
                          className="w-full border border-border/85 rounded-xl bg-background p-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans leading-relaxed"
                        />
                        {isDraftingEmail && (
                          <div className="absolute inset-0 bg-background/40 flex items-center justify-center rounded-xl">
                            <Loader2 className="size-6 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 border border-border hover:bg-secondary/40 font-semibold text-muted-foreground hover:text-foreground rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendMatch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
                >
                  <Send className="size-3.5" /> Confirm & Send
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
