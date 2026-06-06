import { UserProfile, MatchScore, MatchFactorBreakdown } from '@/types';

// Helper to determine profession category for tier matching
function getProfessionTier(designation: string, company: string): string {
  const desc = `${designation} ${company}`.toLowerCase();
  
  if (
    desc.includes('software') || 
    desc.includes('engineer') || 
    desc.includes('developer') || 
    desc.includes('data') || 
    desc.includes('it ') || 
    desc.includes('tech') || 
    desc.includes('illustrator') || 
    desc.includes('architect') ||
    desc.includes('google') ||
    desc.includes('amazon') ||
    desc.includes('microsoft') ||
    desc.includes('wipro') ||
    desc.includes('tcs') ||
    desc.includes('infosys') ||
    desc.includes('zomato') ||
    desc.includes('swiggy') ||
    desc.includes('flipkart')
  ) {
    return 'tech';
  }
  
  if (
    desc.includes('finance') || 
    desc.includes('analyst') || 
    desc.includes('bank') || 
    desc.includes('investment') || 
    desc.includes('wealth') || 
    desc.includes('vp') || 
    desc.includes('vice president') ||
    desc.includes('goldman') ||
    desc.includes('hdfc')
  ) {
    return 'finance';
  }

  if (
    desc.includes('consultant') ||
    desc.includes('consulting') ||
    desc.includes('manager') ||
    desc.includes('business') ||
    desc.includes('lawyer') ||
    desc.includes('corporate') ||
    desc.includes('deloitte') ||
    desc.includes('mckinsey') ||
    desc.includes('accenture')
  ) {
    return 'consulting';
  }

  if (
    desc.includes('doctor') ||
    desc.includes('pediatrician') ||
    desc.includes('scientist') ||
    desc.includes('psychologist') ||
    desc.includes('therapeutics')
  ) {
    return 'medical_science';
  }

  return 'other';
}

function formatIncome(income: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(income) + ' p.a.';
}

export function calculateMatchScore(client: UserProfile, candidate: UserProfile): MatchScore {
  const breakdown: { [category: string]: MatchFactorBreakdown } = {};
  let totalScore = 0;

  const isClientMale = client.gender.toLowerCase() === 'male';

  if (isClientMale) {
    // ==========================================
    // MALE CLIENT SCORING FEMALE CANDIDATE
    // ==========================================

    // 1. Age compatibility (20 pts)
    // Candidate 2-8 yrs younger = 20pts, same age = 10pts, older = 0pts
    let ageScore = 0;
    let ageReason = 'Age compatibility criteria not met';
    const ageDiff = client.age - candidate.age;
    if (ageDiff >= 2 && ageDiff <= 8) {
      ageScore = 20;
      ageReason = `Candidate is ${ageDiff} years younger (2-8 years range match)`;
    } else if (ageDiff === 0) {
      ageScore = 10;
      ageReason = 'Candidate is the same age';
    } else if (ageDiff < 0) {
      ageScore = 0;
      ageReason = `Candidate is ${Math.abs(ageDiff)} years older`;
    } else {
      ageScore = 5; // Fallback for 1 year younger or >8 years younger
      ageReason = `Candidate is ${ageDiff} years younger`;
    }
    breakdown['age'] = { score: ageScore, max: 20, reason: ageReason };
    totalScore += ageScore;

    // 2. Height (15 pts)
    // Candidate shorter = 15pts
    const heightScore = candidate.height < client.height ? 15 : 0;
    const heightReason = candidate.height < client.height 
      ? `Candidate (${candidate.height} cm) is shorter than client (${client.height} cm)`
      : `Candidate (${candidate.height} cm) is not shorter than client (${client.height} cm)`;
    breakdown['height'] = { score: heightScore, max: 15, reason: heightReason };
    totalScore += heightScore;

    // 3. Income (15 pts)
    // Candidate earns less = 15pts
    const incomeScore = candidate.income < client.income ? 15 : 0;
    const incomeReason = candidate.income < client.income
      ? 'Candidate earns less than client'
      : 'Candidate does not earn less than client';
    breakdown['income'] = { score: incomeScore, max: 15, reason: incomeReason };
    totalScore += incomeScore;

    // 4. Kids preference match (15 pts)
    const kidsScore = client.wantKids === candidate.wantKids ? 15 : 0;
    const kidsReason = client.wantKids === candidate.wantKids
      ? `Both selected "${client.wantKids}" regarding children`
      : `Mismatched preference: client wants "${client.wantKids}", candidate wants "${candidate.wantKids}"`;
    breakdown['kids'] = { score: kidsScore, max: 15, reason: kidsReason };
    totalScore += kidsScore;

    // 5. Religion match (10 pts)
    const religionScore = client.religion === candidate.religion ? 10 : 0;
    const religionReason = client.religion === candidate.religion
      ? `Both are ${client.religion}`
      : `Mismatched religion: ${client.religion} vs ${candidate.religion}`;
    breakdown['religion'] = { score: religionScore, max: 10, reason: religionReason };
    totalScore += religionScore;

    // 6. Caste match (5 pts)
    const casteScore = client.caste === candidate.caste ? 5 : 0;
    const casteReason = client.caste === candidate.caste
      ? `Both belong to ${client.caste} caste`
      : `Mismatched caste: ${client.caste} vs ${candidate.caste}`;
    breakdown['caste'] = { score: casteScore, max: 5, reason: casteReason };
    totalScore += casteScore;

    // 7. Diet compatibility (5 pts)
    const dietScore = client.diet === candidate.diet ? 5 : 0;
    const dietReason = client.diet === candidate.diet
      ? `Both are ${client.diet}`
      : `Diet preference difference: ${client.diet} vs ${candidate.diet}`;
    breakdown['diet'] = { score: dietScore, max: 5, reason: dietReason };
    totalScore += dietScore;

    // 8. Relocation compatibility (10 pts)
    const relocMatch = client.openToRelocate === candidate.openToRelocate || candidate.openToRelocate === 'Yes';
    const relocScore = relocMatch ? 10 : 0;
    const relocReason = relocMatch
      ? `Relocation criteria compatible: candidate relocation is "${candidate.openToRelocate}"`
      : `Incompatible relocation preference: client is "${client.openToRelocate}", candidate is "${candidate.openToRelocate}"`;
    breakdown['relocation'] = { score: relocScore, max: 10, reason: relocReason };
    totalScore += relocScore;

    // 9. Language overlap (5 pts)
    const clientLangs = client.languagesKnown || [];
    const candLangs = candidate.languagesKnown || [];
    const overlap = clientLangs.filter(lang => candLangs.includes(lang));
    const langScore = overlap.length > 0 ? 5 : 0;
    const langReason = overlap.length > 0
      ? `Common languages: ${overlap.join(', ')}`
      : 'No common languages spoken';
    breakdown['languages'] = { score: langScore, max: 5, reason: langReason };
    totalScore += langScore;

  } else {
    // ==========================================
    // FEMALE CLIENT SCORING MALE CANDIDATE
    // ==========================================

    // 1. Profession tier match (20 pts)
    const clientTier = getProfessionTier(client.designation, client.currentCompany);
    const candTier = getProfessionTier(candidate.designation, candidate.currentCompany);
    const professionScore = clientTier === candTier && clientTier !== 'other' ? 20 : 0;
    const professionReason = clientTier === candTier && clientTier !== 'other'
      ? `Both work in the same profession tier (${clientTier})`
      : `Different profession tiers: ${clientTier} vs ${candTier}`;
    breakdown['profession'] = { score: professionScore, max: 20, reason: professionReason };
    totalScore += professionScore;

    // 2. Income tier compatibility (15 pts)
    // Man earns >= woman = 15pts
    const incomeScore = candidate.income >= client.income ? 15 : 0;
    const incomeReason = candidate.income >= client.income
      ? `Candidate earns more or equal: candidate ${formatIncome(candidate.income)} >= client ${formatIncome(client.income)}`
      : `Candidate earns less: candidate ${formatIncome(candidate.income)} < client ${formatIncome(client.income)}`;
    breakdown['income'] = { score: incomeScore, max: 15, reason: incomeReason };
    totalScore += incomeScore;

    // 3. Relocation match (15 pts)
    const relocMatch = client.openToRelocate === candidate.openToRelocate || candidate.openToRelocate === 'Yes';
    const relocScore = relocMatch ? 15 : 0;
    const relocReason = relocMatch
      ? `Relocation preference compatible: candidate relocation is "${candidate.openToRelocate}"`
      : `Mismatched relocation preference: client is "${client.openToRelocate}", candidate is "${candidate.openToRelocate}"`;
    breakdown['relocation'] = { score: relocScore, max: 15, reason: relocReason };
    totalScore += relocScore;

    // 4. Family type match (10 pts)
    const familyScore = client.familyType === candidate.familyType ? 10 : 0;
    const familyReason = client.familyType === candidate.familyType
      ? `Both prefer ${client.familyType} family type`
      : `Mismatched family type: client is ${client.familyType}, candidate is ${candidate.familyType}`;
    breakdown['family'] = { score: familyScore, max: 10, reason: familyReason };
    totalScore += familyScore;

    // 5. Kids preference (15 pts)
    const kidsScore = client.wantKids === candidate.wantKids ? 15 : 0;
    const kidsReason = client.wantKids === candidate.wantKids
      ? `Both selected "${client.wantKids}" regarding children`
      : `Mismatched preference: client is "${client.wantKids}", candidate is "${candidate.wantKids}"`;
    breakdown['kids'] = { score: kidsScore, max: 15, reason: kidsReason };
    totalScore += kidsScore;

    // 6. Religion (10 pts)
    const religionScore = client.religion === candidate.religion ? 10 : 0;
    const religionReason = client.religion === candidate.religion
      ? `Both are ${client.religion}`
      : `Mismatched religion: ${client.religion} vs ${candidate.religion}`;
    breakdown['religion'] = { score: religionScore, max: 10, reason: religionReason };
    totalScore += religionScore;

    // 7. Diet (5 pts)
    const dietScore = client.diet === candidate.diet ? 5 : 0;
    const dietReason = client.diet === candidate.diet
      ? `Both are ${client.diet}`
      : `Diet preference difference: ${client.diet} vs ${candidate.diet}`;
    breakdown['diet'] = { score: dietScore, max: 5, reason: dietReason };
    totalScore += dietScore;

    // 8. Language overlap (5 pts)
    const clientLangs = client.languagesKnown || [];
    const candLangs = candidate.languagesKnown || [];
    const overlap = clientLangs.filter(lang => candLangs.includes(lang));
    const langScore = overlap.length > 0 ? 5 : 0;
    const langReason = overlap.length > 0
      ? `Common languages: ${overlap.join(', ')}`
      : 'No common languages spoken';
    breakdown['languages'] = { score: langScore, max: 5, reason: langReason };
    totalScore += langScore;

    // 9. Manglik compatibility (5 pts)
    const manglikMatch = 
      client.manglik === candidate.manglik || 
      client.manglik === 'Doesnt Matter' || 
      candidate.manglik === 'Doesnt Matter';
    const manglikScore = manglikMatch ? 5 : 0;
    const manglikReason = manglikMatch
      ? `Compatible Manglik status (client: ${client.manglik}, candidate: ${candidate.manglik})`
      : `Incompatible Manglik status: client is ${client.manglik}, candidate is ${candidate.manglik}`;
    breakdown['manglik'] = { score: manglikScore, max: 5, reason: manglikReason };
    totalScore += manglikScore;
  }

  // Determine Compatibility Tier
  let tier: MatchScore['tier'] = 'Potential Match';
  if (totalScore >= 80) {
    tier = 'High Potential';
  } else if (totalScore >= 50) {
    tier = 'Good Match';
  }

  return {
    score: totalScore,
    tier,
    breakdown
  };
}

export function getTopMatches(client: UserProfile, pool: UserProfile[], limit = 10): MatchScore[] {
  const oppositeGender = client.gender.toLowerCase() === 'male' ? 'female' : 'male';
  
  return pool
    .filter(candidate => candidate.gender.toLowerCase() === oppositeGender)
    .map(candidate => {
      const matchScore = calculateMatchScore(client, candidate);
      return {
        ...matchScore,
        candidate
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
