// Demo credentials
export const DEMO_CREDENTIALS = {
  email: 'demo@event.com',
  password: 'demo123'
};

export const DEMO_TOKEN = 'DEMO_MODE_TOKEN';

// Demo data
export const DEMO_PARTICIPANTS = [
  { id: '1', name: 'Budi Santoso', chances: 3, drawn: false, createdAt: new Date().toISOString() },
  { id: '2', name: 'Siti Rahma', chances: 2, drawn: false, createdAt: new Date().toISOString() },
  { id: '3', name: 'Ahmad Fadli', chances: 3, drawn: false, createdAt: new Date().toISOString() },
  { id: '4', name: 'Dewi Lestari', chances: 1, drawn: false, createdAt: new Date().toISOString() },
  { id: '5', name: 'Rudi Hermawan', chances: 2, drawn: false, createdAt: new Date().toISOString() },
  { id: '6', name: 'Maya Putri', chances: 3, drawn: false, createdAt: new Date().toISOString() },
];

export const DEMO_PRIZES = [
  { id: '1', name: 'Laptop Gaming', weight: 2, createdAt: new Date().toISOString() },
  { id: '2', name: 'Smartphone', weight: 5, createdAt: new Date().toISOString() },
  { id: '3', name: 'Smartwatch', weight: 6, createdAt: new Date().toISOString() },
  { id: '4', name: 'Headphone Premium', weight: 8, createdAt: new Date().toISOString() },
  { id: '5', name: 'Powerbank', weight: 10, createdAt: new Date().toISOString() },
  { id: '6', name: 'Voucher Rp 500.000', weight: 12, createdAt: new Date().toISOString() },
  { id: '7', name: 'Voucher Rp 100.000', weight: 15, createdAt: new Date().toISOString() },
  { id: '8', name: 'Tumbler Eksklusif', weight: 20, createdAt: new Date().toISOString() },
];

export const DEMO_LOGS: any[] = [];

// Demo mode storage keys
const STORAGE_KEYS = {
  participants: 'demo_participants',
  prizes: 'demo_prizes',
  logs: 'demo_logs'
};

// Initialize demo data in localStorage
export function initializeDemoData() {
  if (!localStorage.getItem(STORAGE_KEYS.participants)) {
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(DEMO_PARTICIPANTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.prizes)) {
    localStorage.setItem(STORAGE_KEYS.prizes, JSON.stringify(DEMO_PRIZES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.logs)) {
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(DEMO_LOGS));
  }
}

// Demo API functions
export const demoAPI = {
  // Participants
  getParticipants: () => {
    const data = localStorage.getItem(STORAGE_KEYS.participants);
    return JSON.parse(data || '[]');
  },

  addParticipant: (participant: any) => {
    const participants = demoAPI.getParticipants();
    const newParticipant = {
      ...participant,
      id: Date.now().toString(),
      drawn: false,
      createdAt: new Date().toISOString()
    };
    participants.push(newParticipant);
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants));
    return newParticipant;
  },

  updateParticipant: (id: string, updates: any) => {
    const participants = demoAPI.getParticipants();
    const index = participants.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      participants[index] = { ...participants[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(participants));
      return participants[index];
    }
    return null;
  },

  deleteParticipant: (id: string) => {
    const participants = demoAPI.getParticipants();
    const filtered = participants.filter((p: any) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(filtered));
  },

  resetParticipants: () => {
    const participants = demoAPI.getParticipants();
    const reset = participants.map((p: any) => ({ ...p, drawn: false, updatedAt: new Date().toISOString() }));
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(reset));
    return reset;
  },

  // Prizes
  getPrizes: () => {
    const data = localStorage.getItem(STORAGE_KEYS.prizes);
    return JSON.parse(data || '[]');
  },

  addPrize: (prize: any) => {
    const prizes = demoAPI.getPrizes();
    const newPrize = {
      ...prize,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    prizes.push(newPrize);
    localStorage.setItem(STORAGE_KEYS.prizes, JSON.stringify(prizes));
    return newPrize;
  },

  updatePrize: (id: string, updates: any) => {
    const prizes = demoAPI.getPrizes();
    const index = prizes.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      prizes[index] = { ...prizes[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.prizes, JSON.stringify(prizes));
      return prizes[index];
    }
    return null;
  },

  deletePrize: (id: string) => {
    const prizes = demoAPI.getPrizes();
    const filtered = prizes.filter((p: any) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.prizes, JSON.stringify(filtered));
  },

  // Event operations
  getNextParticipant: () => {
    const participants = demoAPI.getParticipants();
    const notDrawn = participants.filter((p: any) => !p.drawn);
    if (notDrawn.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * notDrawn.length);
    return notDrawn[randomIndex];
  },

  spinWheel: () => {
    const prizes = demoAPI.getPrizes();
    if (prizes.length === 0) return null;

    const totalWeight = prizes.reduce((sum: number, p: any) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const prize of prizes) {
      random -= prize.weight;
      if (random <= 0) {
        return prize;
      }
    }
    return prizes[0];
  },

  completeSession: (participantId: string, results: any[]) => {
    // Mark participant as drawn
    demoAPI.updateParticipant(participantId, { drawn: true });

    // Get participant name
    const participant = demoAPI.getParticipants().find((p: any) => p.id === participantId);

    // Add to logs
    const logs = demoAPI.getLogs();
    const logEntry = {
      id: Date.now().toString(),
      participantId,
      participantName: participant?.name || 'Unknown',
      results,
      timestamp: new Date().toISOString()
    };
    logs.push(logEntry);
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify(logs));
  },

  // Logs
  getLogs: () => {
    const data = localStorage.getItem(STORAGE_KEYS.logs);
    const logs = JSON.parse(data || '[]');
    return logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // Reset all demo data
  resetAllData: () => {
    localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(DEMO_PARTICIPANTS));
    localStorage.setItem(STORAGE_KEYS.prizes, JSON.stringify(DEMO_PRIZES));
    localStorage.setItem(STORAGE_KEYS.logs, JSON.stringify([]));
  }
};
