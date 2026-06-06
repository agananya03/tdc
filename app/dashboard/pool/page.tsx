'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import poolData from '@/data/pool.json';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfile } from '@/types';
import { 
  Search, 
  MapPin, 
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PoolSearchPage() {
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReligion, setSelectedReligion] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedIncomeRange, setSelectedIncomeRange] = useState('all');
  const [selectedAgeRange, setSelectedAgeRange] = useState('all');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const candidates = poolData as UserProfile[];

  // Helper to format currency
  const formatIncome = (income: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(income) + ' p.a.';
  };

  // Filter Logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(query) || c.city.toLowerCase().includes(query) || c.designation.toLowerCase().includes(query);

      // 2. Religion Filter
      const matchesReligion = selectedReligion === 'all' || c.religion === selectedReligion;

      // 3. City Filter
      const matchesCity = selectedCity === 'all' || c.city === selectedCity;

      // 4. Income Filter
      let matchesIncome = true;
      if (selectedIncomeRange !== 'all') {
        if (selectedIncomeRange === 'under-15') {
          matchesIncome = c.income < 1500000;
        } else if (selectedIncomeRange === '15-25') {
          matchesIncome = c.income >= 1500000 && c.income <= 2500000;
        } else if (selectedIncomeRange === '25-35') {
          matchesIncome = c.income >= 2500000 && c.income <= 3500000;
        } else if (selectedIncomeRange === 'above-35') {
          matchesIncome = c.income > 3500000;
        }
      }

      // 5. Age Filter
      let matchesAge = true;
      if (selectedAgeRange !== 'all') {
        if (selectedAgeRange === '20-27') {
          matchesAge = c.age >= 20 && c.age <= 27;
        } else if (selectedAgeRange === '28-33') {
          matchesAge = c.age >= 28 && c.age <= 33;
        } else if (selectedAgeRange === '34-40') {
          matchesAge = c.age >= 34 && c.age <= 40;
        }
      }

      return matchesSearch && matchesReligion && matchesCity && matchesIncome && matchesAge;
    });
  }, [candidates, searchQuery, selectedReligion, selectedCity, selectedIncomeRange, selectedAgeRange]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedReligion('all');
    setSelectedCity('all');
    setSelectedIncomeRange('all');
    setSelectedAgeRange('all');
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Advanced Filters Panel */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Name Search */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Search className="size-4" />
            </span>
            <input
              type="text"
              placeholder="Search candidate profiles by name, city or job role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* Religion Filter */}
            <select
              value={selectedReligion}
              onChange={(e) => setSelectedReligion(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="all">All Religions</option>
              <option value="Hindu">Hindu</option>
              <option value="Muslim">Muslim</option>
              <option value="Sikh">Sikh</option>
              <option value="Christian">Christian</option>
              <option value="Jain">Jain</option>
            </select>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="all">All Cities</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Pune">Pune</option>
              <option value="Chennai">Chennai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Kolkata">Kolkata</option>
            </select>

            {/* Income Range Filter */}
            <select
              value={selectedIncomeRange}
              onChange={(e) => setSelectedIncomeRange(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="all">All Incomes</option>
              <option value="under-15">Under ₹15 Lakhs</option>
              <option value="15-25">₹15L - ₹25 Lakhs</option>
              <option value="25-35">₹25L - ₹35 Lakhs</option>
              <option value="above-35">Above ₹35 Lakhs</option>
            </select>

            {/* Age Range Filter */}
            <select
              value={selectedAgeRange}
              onChange={(e) => setSelectedAgeRange(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="all">All Ages</option>
              <option value="20-27">20 - 27 Years</option>
              <option value="28-33">28 - 33 Years</option>
              <option value="34-40">34 - 40 Years</option>
            </select>

          </div>
        </div>

        {/* Clear Filters Summary */}
        {(searchQuery || selectedReligion !== 'all' || selectedCity !== 'all' || selectedIncomeRange !== 'all' || selectedAgeRange !== 'all') && (
          <div className="flex items-center justify-between pt-2.5 border-t border-border/50 text-xs font-medium text-muted-foreground">
            <span>
              Found {filteredCandidates.length} of {candidates.length} profiles matching filters.
            </span>
            <button
              onClick={handleClearFilters}
              className="text-primary hover:underline font-bold"
            >
              Clear Filters
            </button>
          </div>
        )}
      </section>

      {/* Main Grid View */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading-pool"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card border border-border/80 rounded-2xl p-4 space-y-4 shadow-3xs">
                <div className="flex gap-4">
                  <Skeleton className="size-14 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1 pt-1">
                    <Skeleton className="h-4.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Skeleton className="h-2 w-10" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : filteredCandidates.length === 0 ? (
          <motion.div
            key="empty-pool"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-3xs"
          >
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/60 mb-1">
              <Search className="size-7" />
            </div>
            <h3 className="font-serif font-bold text-lg text-foreground">No Candidates Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm leading-normal">
              No profiles in the matrimonial candidate pool match your selected filter criteria. Try expanding search variables.
            </p>
            <button
              onClick={handleClearFilters}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition-colors"
            >
              Reset All Filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="pool-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filteredCandidates.map((candidate) => {
              const fullName = `${candidate.firstName} ${candidate.lastName}`;
              return (
                <motion.div
                  key={candidate.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="bg-card border border-border/80 hover:border-primary/25 rounded-2xl p-4 shadow-3xs hover:shadow-xs transition-all flex flex-col justify-between gap-4 relative overflow-hidden group"
                >
                  <div className="flex gap-4">
                    {/* Avatar Photo */}
                    <div className="relative size-14 rounded-full overflow-hidden border border-border shrink-0 bg-secondary">
                      {candidate.photo ? (
                        <Image
                          src={candidate.photo}
                          alt={fullName}
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

                    {/* Meta information */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {fullName}
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                        <span>Female</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{candidate.age} yrs</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">
                        {candidate.designation}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-border/50" />

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider block">Location</span>
                      <span className="text-foreground truncate block flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground" />
                        {candidate.city}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider block">Religion & Caste</span>
                      <span className="text-foreground truncate block">
                        {candidate.religion} · {candidate.caste}
                      </span>
                    </div>
                  </div>

                  {/* Footer Stats block */}
                  <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-muted-foreground/80">
                    <span className="truncate max-w-[120px] flex items-center gap-1">
                      <Briefcase className="size-3 shrink-0" />
                      {candidate.currentCompany}
                    </span>
                    <span className="text-primary font-serif font-bold">
                      {formatIncome(candidate.income)}
                    </span>
                  </div>

                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
