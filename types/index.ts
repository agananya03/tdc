export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  age: number;
  country: string;
  city: string;
  height: number;
  email: string;
  phone: string;
  photo: string;
  undergraduateCollege: string;
  degree: string;
  postGraduation: string;
  income: number;
  currentCompany: string;
  designation: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  gotra: string;
  motherTongue: string;
  complexion: string;
  diet: string;
  smoking: string;
  drinking: string;
  familyType: string;
  languagesKnown: string[];
  siblings: number;
  wantKids: string;
  openToRelocate: string;
  openToPets: string;
  manglik: string;
  journeyStage?: 'New' | 'Active' | 'Match Sent' | 'Engaged' | 'Closed';
}

export interface MatchFactorBreakdown {
  score: number;
  max: number;
  reason: string;
}

export interface MatchScore {
  score: number;
  tier: 'High Potential' | 'Good Match' | 'Potential Match';
  breakdown: {
    [category: string]: MatchFactorBreakdown;
  };
  candidate?: UserProfile; // Candidate profile for getTopMatches
}

export interface MatchmakerNote {
  id: string;
  matchmakerId: string;
  matchmakerName: string;
  profileId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'matchmaker' | 'member';
  profileId?: string;
  avatarUrl?: string;
  lastLogin?: string;
}
