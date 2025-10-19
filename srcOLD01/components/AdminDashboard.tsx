import { useState, useEffect } from 'react';
import { Users, Gift, FileText, Monitor, LogOut, Upload, Plus, Edit, Trash2, RotateCcw, CheckCircle, XCircle, Zap, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { SetupHelper } from './SetupHelper';
import { StatsCard } from './StatsCard';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { demoAPI } from '../utils/demo-data';

interface Participant {
  id: string;
  name: string;
  chances: number;
  drawn: boolean;
}

interface Prize {
  id: string;
  name: string;
  weight: number; // Weight/probability (1-100)
  quantity: number; // Available quantity
}

interface EventLog {
  id: string;
  participantName: string;
  results: { name: string }[];
  timestamp: string;
}

interface AdminDashboardProps {
  accessToken: string;
  isDemoMode: boolean;
  onLogout: () => void;
  onViewEvent: () => void;
  onViewSlotSpin: () => void;
}

export function AdminDashboard({ accessToken, isDemoMode, onLogout, onViewEvent, onViewSlotSpin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'participants' | 'prizes' | 'logs'>('participants');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Participant form state
  const [participantName, setParticipantName] = useState('');
  const [participantChances, setParticipantChances] = useState('1');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);

  // Prize form state
  const [prizeName, setPrizeName] = useState('');
  const [prizeWeight, setPrizeWeight] = useState('10');
  const [prizeQuantity, setPrizeQuantity] = useState('10');
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [isPrizeDialogOpen, setIsPrizeDialogOpen] = useState(false);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  useEffect(() => {
    fetchData();
    // Also fetch prizes for stats
    if (activeTab === 'participants') {
      fetchPrizes();
    }
  }, [activeTab]);

  const fetchPrizes = async () => {
    try {
      if (isDemoMode) {
        setPrizes(demoAPI.getPrizes());
      } else {
        const res = await fetch(`${apiUrl}/prizes`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        setPrizes(data.prizes || []);
      }
    } catch (error) {
      console.error('Error fetching prizes:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        // Use demo data
        if (activeTab === 'participants') {
          setParticipants(demoAPI.getParticipants());
        } else if (activeTab === 'prizes') {
          setPrizes(demoAPI.getPrizes());
        } else if (activeTab === 'logs') {
          setLogs(demoAPI.getLogs());
        }
      } else {
        // Use API
        if (activeTab === 'participants') {
          const res = await fetch(`${apiUrl}/participants`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const data = await res.json();
          setParticipants(data.participants || []);
        } else if (activeTab === 'prizes') {
          const res = await fetch(`${apiUrl}/prizes`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const data = await res.json();
          setPrizes(data.prizes || []);
        } else if (activeTab === 'logs') {
          const res = await fetch(`${apiUrl}/event/logs`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const data = await res.json();
          setLogs(data.logs || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Participant operations
  const handleSaveParticipant = async () => {
    try {
      if (isDemoMode) {
        if (editingParticipant) {
          demoAPI.updateParticipant(editingParticipant.id, { name: participantName, chances: parseInt(participantChances) });
        } else {
          demoAPI.addParticipant({ name: participantName, chances: parseInt(participantChances) });
        }
      } else {
        if (editingParticipant) {
          await fetch(`${apiUrl}/participants/${editingParticipant.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name: participantName, chances: participantChances })
          });
        } else {
          await fetch(`${apiUrl}/participants`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name: participantName, chances: participantChances })
          });
        }
      }
      setIsParticipantDialogOpen(false);
      resetParticipantForm();
      fetchData();
    } catch (error) {
      console.error('Error saving participant:', error);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this participant?')) return;
    try {
      if (isDemoMode) {
        demoAPI.deleteParticipant(id);
      } else {
        await fetch(`${apiUrl}/participants/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting participant:', error);
    }
  };

  const handleResetDrawn = async () => {
    if (!confirm('Are you sure you want to reset all participants\' drawn status?')) return;
    try {
      if (isDemoMode) {
        demoAPI.resetParticipants();
      } else {
        await fetch(`${apiUrl}/participants/reset`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
      fetchData();
    } catch (error) {
      console.error('Error resetting:', error);
    }
  };

  const resetParticipantForm = () => {
    setParticipantName('');
    setParticipantChances('1');
    setEditingParticipant(null);
  };

  // Prize operations
  const handleSavePrize = async () => {
    try {
      const weight = parseInt(prizeWeight);
      const quantity = parseInt(prizeQuantity);
      
      // Validate weight
      if (weight <= 0 || weight > 100) {
        alert('Weight must be between 1-100');
        return;
      }
      
      // Validate quantity
      if (quantity < 0) {
        alert('Quantity must be 0 or greater');
        return;
      }
      
      if (isDemoMode) {
        if (editingPrize) {
          demoAPI.updatePrize(editingPrize.id, { name: prizeName, weight, quantity });
        } else {
          demoAPI.addPrize({ name: prizeName, weight, quantity });
        }
      } else {
        if (editingPrize) {
          await fetch(`${apiUrl}/prizes/${editingPrize.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name: prizeName, weight, quantity })
          });
        } else {
          await fetch(`${apiUrl}/prizes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name: prizeName, weight, quantity })
          });
        }
      }
      setIsPrizeDialogOpen(false);
      resetPrizeForm();
      fetchData();
    } catch (error) {
      console.error('Error saving prize:', error);
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prize?')) return;
    try {
      if (isDemoMode) {
        demoAPI.deletePrize(id);
      } else {
        await fetch(`${apiUrl}/prizes/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting prize:', error);
    }
  };

  const resetPrizeForm = () => {
    setPrizeName('');
    setPrizeWeight('10');
    setPrizeQuantity('10');
    setEditingPrize(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-white">Admin Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Event Management</p>
          {isDemoMode && (
            <div className="mt-3 flex items-center gap-2 bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs">Demo Mode</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('participants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'participants'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Manage Participants</span>
          </button>

          <button
            onClick={() => setActiveTab('prizes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'prizes'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Gift className="w-5 h-5" />
            <span>Manage Prizes</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Event Logs</span>
          </button>

          <div className="pt-4 border-t border-slate-700 space-y-2">
            <button
              onClick={onViewEvent}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 transition-all"
            >
              <Monitor className="w-5 h-5" />
              <span>Prize Wheel Event</span>
            </button>
            
            <button
              onClick={onViewSlotSpin}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 transition-all"
            >
              <Users className="w-5 h-5" />
              <span>Slot Spin Event</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'participants' && (
          <div>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatsCard
                icon={Users}
                label="Total Participants"
                value={participants.length}
                color="purple"
              />
              <StatsCard
                icon={CheckCircle}
                label="Already Drawn"
                value={participants.filter(p => p.drawn).length}
                color="green"
              />
              <StatsCard
                icon={XCircle}
                label="Not Yet Drawn"
                value={participants.filter(p => !p.drawn).length}
                color="blue"
              />
              <StatsCard
                icon={Gift}
                label="Total Prizes"
                value={prizes.length}
                color="orange"
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-white mb-2">Participant List & Draw Chances</h1>
                <p className="text-slate-400">Manage participant data for the draw</p>
              </div>
              <div className="flex gap-3">
                {participants.length === 0 && prizes.length === 0 && !isDemoMode && (
                  <SetupHelper accessToken={accessToken} isDemoMode={isDemoMode} onSetupComplete={fetchData} />
                )}
                <Button
                  onClick={() => {
                    resetParticipantForm();
                    setIsParticipantDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Participant
                </Button>
              </div>
            </div>

            <Dialog open={isParticipantDialogOpen} onOpenChange={setIsParticipantDialogOpen}>
              <DialogContent className="bg-slate-800 text-white border-slate-700">
                <DialogHeader>
                  <DialogTitle>{editingParticipant ? 'Edit Participant' : 'Add New Participant'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Participant Name</Label>
                    <Input
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="Enter participant name"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label>Chances (Number of Spins)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={participantChances}
                      onChange={(e) => setParticipantChances(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleSaveParticipant}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
                  >
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mb-4">
              <Button
                onClick={handleResetDrawn}
                variant="destructive"
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Draw (Clear Drawn Status)
              </Button>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-300">ID</th>
                      <th className="px-6 py-4 text-left text-slate-300">Participant Name</th>
                      <th className="px-6 py-4 text-left text-slate-300">Chances (x)</th>
                      <th className="px-6 py-4 text-left text-slate-300">Status</th>
                      <th className="px-6 py-4 text-left text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          No participants yet. Click &quot;Add Participant&quot; button to start.
                        </td>
                      </tr>
                    ) : (
                      participants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4 text-slate-400 text-sm">{participant.id.slice(0, 8)}</td>
                          <td className="px-6 py-4 text-white">{participant.name}</td>
                          <td className="px-6 py-4 text-white">{participant.chances}x</td>
                          <td className="px-6 py-4">
                            {participant.drawn ? (
                              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                                Drawn
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                Not Drawn
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingParticipant(participant);
                                  setParticipantName(participant.name);
                                  setParticipantChances(participant.chances.toString());
                                  setIsParticipantDialogOpen(true);
                                }}
                                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4 text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteParticipant(participant.id)}
                                className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prizes' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-white mb-2">Manage Prizes</h1>
                <p className="text-slate-400">Set prizes, weight (probability), and quantity</p>
              </div>
              <Button
                onClick={() => {
                  resetPrizeForm();
                  setIsPrizeDialogOpen(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Prize
              </Button>
            </div>

            <Dialog open={isPrizeDialogOpen} onOpenChange={setIsPrizeDialogOpen}>
              <DialogContent className="bg-slate-800 text-white border-slate-700">
                <DialogHeader>
                  <DialogTitle>{editingPrize ? 'Edit Prize' : 'Add New Prize'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Prize Name</Label>
                    <Input
                      value={prizeName}
                      onChange={(e) => setPrizeName(e.target.value)}
                      placeholder="e.g., Smartphone"
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label>Weight (Probability)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={prizeWeight}
                      onChange={(e) => setPrizeWeight(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-slate-400 text-sm mt-1">
                      Weight 1-100. Higher weight = higher probability.
                    </p>
                  </div>
                  <div>
                    <Label>Quantity (Stock Available)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={prizeQuantity}
                      onChange={(e) => setPrizeQuantity(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-slate-400 text-sm mt-1">
                      Number of prizes available. When 0, prize won't appear in wheel.
                    </p>
                  </div>
                  <Button
                    onClick={handleSavePrize}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500"
                  >
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Total Weight Info */}
            <div className="mb-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Weight:</span>
                <span className="text-xl text-blue-400">
                  {prizes.reduce((sum, p) => sum + p.weight, 0)}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-2">
                💡 Total weight is used for probability calculation. Doesn't need to equal 100.
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-300">ID</th>
                      <th className="px-6 py-4 text-left text-slate-300">Prize Name</th>
                      <th className="px-6 py-4 text-left text-slate-300">Weight</th>
                      <th className="px-6 py-4 text-left text-slate-300">Quantity</th>
                      <th className="px-6 py-4 text-left text-slate-300">Probability</th>
                      <th className="px-6 py-4 text-left text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {prizes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          No prizes yet. Click &quot;Add Prize&quot; button to start.
                        </td>
                      </tr>
                    ) : (
                      prizes.map((prize) => {
                        const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
                        const probability = ((prize.weight / totalWeight) * 100).toFixed(1);
                        return (
                          <tr key={prize.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400 text-sm">{prize.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 text-white">{prize.name}</td>
                            <td className="px-6 py-4 text-white">{prize.weight}</td>
                            <td className="px-6 py-4">
                              <span className={`${prize.quantity === 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                                {prize.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-green-400">{probability}%</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPrize(prize);
                                    setPrizeName(prize.name);
                                    setPrizeWeight(prize.weight.toString());
                                    setPrizeQuantity(prize.quantity.toString());
                                    setIsPrizeDialogOpen(true);
                                  }}
                                  className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-blue-400" />
                                </button>
                                <button
                                  onClick={() => handleDeletePrize(prize.id)}
                                  className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <div className="mb-6">
              <h1 className="text-white mb-2">Event Logs</h1>
              <p className="text-slate-400">History of draws conducted</p>
            </div>

            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No event logs yet</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white mb-1">{log.participantName}</h3>
                        <p className="text-slate-400 text-sm">
                          {new Date(log.timestamp).toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {log.results?.map((result: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-3">
                          <span className="text-purple-400">Spin {idx + 1}:</span>
                          <span className="text-white">{result.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
