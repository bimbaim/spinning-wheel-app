// Demo credentials
export const DEMO_CREDENTIALS = {
  email: 'demo@event.com',
  password: 'demo123'
};

export const DEMO_TOKEN = 'DEMO_MODE_TOKEN';

// Demo data
export const DEMO_PARTICIPANTS = [
  { id: '1', name: 'John Smith', chances: 3, drawn: false, createdAt: new Date().toISOString() },
  { id: '2', name: 'Sarah Johnson', chances: 2, drawn: false, createdAt: new Date().toISOString() },
  { id: '3', name: 'Michael Brown', chances: 3, drawn: false, createdAt: new Date().toISOString() },
  { id: '4', name: 'Emily Davis', chances: 1, drawn: false, createdAt: new Date().toISOString() },
  { id: '5', name: 'David Wilson', chances: 2, drawn: false, createdAt: new Date().toISOString() },
  { id: '6', name: 'Jessica Martinez', chances: 3, drawn: false, createdAt: new Date().toISOString() },
];

export const DEMO_PRIZES = [
  { id: '1', name: 'Gaming Laptop', weight: 2, quantity: 2, createdAt: new Date().toISOString() },
  { id: '2', name: 'Smartphone', weight: 5, quantity: 3, createdAt: new Date().toISOString() },
  { id: '3', name: 'Smartwatch', weight: 6, quantity: 5, createdAt: new Date().toISOString() },
  { id: '4', name: 'Premium Headphones', weight: 8, quantity: 8, createdAt: new Date().toISOString() },
  { id: '5', name: 'Powerbank', weight: 10, quantity: 10, createdAt: new Date().toISOString() },
  { id: '6', name: '$50 Voucher', weight: 12, quantity: 15, createdAt: new Date().toISOString() },
  { id: '7', name: '$10 Voucher', weight: 15, quantity: 20, createdAt: new Date().toISOString() },
  { id: '8', name: 'Exclusive Tumbler', weight: 20, quantity: 25, createdAt: new Date().toISOString() },
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
    // Filter only available prizes (quantity > 0)
    const availablePrizes = prizes.filter((p: any) => p.quantity > 0);
    
    if (availablePrizes.length === 0) return null;

    // Weighted random selection
    const totalWeight = availablePrizes.reduce((sum: number, p: any) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const prize of availablePrizes) {
      random -= prize.weight;
      if (random <= 0) {
        // Decrease quantity
        demoAPI.updatePrize(prize.id, { quantity: prize.quantity - 1 });
        return prize;
      }
    }
    return availablePrizes[0];
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
