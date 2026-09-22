export type MemoryItem = {
  type: "memory";
  id: string;
  content: string;
  memoryType?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  linkedPromptId?: string | null;
  displayName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  projectPath?: string | null;
  projectName?: string | null;
  gitRepoUrl?: string | null;
  isPinned?: boolean;
  isStaged?: boolean;
  source?: string;
  authority?: string;
  observedAt?: number | null;
  validUntil?: number | null;
  injectCount?: number;
  similarity?: number;
};

export type PromptItem = {
  type: "prompt";
  id: string;
  sessionId?: string;
  content: string;
  createdAt: string;
  projectPath?: string | null;
  linkedMemoryId?: string | null;
  similarity?: number;
};

export type MemoryPage = {
  items: Array<MemoryItem | PromptItem>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MemoryTag = {
  tag: string;
  displayName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  projectPath?: string | null;
  projectName?: string | null;
  gitRepoUrl?: string | null;
};

export type MemoryStats = {
  total: number;
  byScope: Record<string, number>;
  byType: Record<string, number>;
};

export type ProfileSignal = {
  category?: string;
  description: string;
  confidence?: number;
  evidence?: string[];
  alpha?: number;
  beta?: number;
  weakAlpha?: number;
  weakBeta?: number;
  lastMatchTime?: number | null;
  firstSeen?: number | null;
  lastSeen?: number | null;
  pendingValidation?: boolean;
  centroid?: number[];
  anchor?: number[];
  frequency?: number;
  weakHitCount?: number;
  lastWeakHitAt?: number | null;
  driftBelowCount?: number;
};

export type ProfilePreference = ProfileSignal;
export type ProfilePattern = ProfileSignal;
export type ProfileWorkflow = ProfileSignal & { steps: string[] };

export type UserProfile = {
  exists: boolean;
  id?: string;
  userId?: string;
  displayName?: string;
  userName?: string;
  userEmail?: string;
  version?: number;
  createdAt?: string;
  lastAnalyzedAt?: string | null;
  totalPromptsAnalyzed?: number;
  profileData?: {
    preferences: ProfilePreference[];
    patterns: ProfilePattern[];
    workflows: ProfileWorkflow[];
  };
};

export type CreateMemoryInput = {
  containerTag: string;
  content: string;
  memoryType?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type UpdateMemoryInput = Partial<Omit<CreateMemoryInput, "containerTag">> & {
  isStaged?: boolean;
};
