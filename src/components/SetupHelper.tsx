import { useState } from 'react';
import { Wand2, Users, Gift } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SetupHelperProps {
  accessToken: string;
  isDemoMode: boolean;
  onSetupComplete: () => void;
}

export function SetupHelper({ accessToken, isDemoMode, onSetupComplete }: SetupHelperProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;

  const setupSampleData = async () => {
    setLoading(true);

    try {
      // Add sample prizes
      const prizes = [
        // Total weight: 100
        { name: 'Tiket Liburan ke Bali (3D2N)', weight: 1 },         // 1%
        { name: 'Drone Kamera Profesional', weight: 4 },            // 4%
        { name: 'Smart TV 40 Inch', weight: 8 },                    // 8%
        { name: 'Sepeda Gunung Premium', weight: 12 },               // 12%
        { name: 'Voucher Belanja Rp 1.000.000', weight: 15 },         // 15%
        { name: 'Earbuds Wireless Terbaik', weight: 18 },            // 18%
        { name: 'Merchandise Eksklusif Acara', weight: 22 },          // 22%
        { name: 'Diskon 50% Tiket Event Berikutnya', weight: 20 },     // 20%
      ];

      for (const prize of prizes) {
        await fetch(`${apiUrl}/prizes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(prize)
        });
      }

      // Add sample participants
      const participants = [
        { name: 'Budi Santoso', chances: 3 },
        { name: 'Siti Rahma', chances: 2 },
        { name: 'Ahmad Fadli', chances: 3 },
        { name: 'Dewi Lestari', chances: 1 },
        { name: 'Rudi Hermawan', chances: 2 },
        { name: 'Maya Putri', chances: 3 },
      ];

      for (const participant of participants) {
        await fetch(`${apiUrl}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(participant)
        });
      }

      setOpen(false);
      onSetupComplete();
    } catch (error) {
      console.error('Error setting up sample data:', error);
      alert('Gagal membuat data sample. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Setup Data Sample
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle>Setup Data Sample</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-slate-400">
            Fitur ini akan menambahkan data sample untuk memudahkan testing aplikasi.
          </p>

          <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white">8 Hadiah</p>
                <p className="text-slate-400 text-sm">Dengan berbagai bobot peluang</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white">6 Peserta</p>
                <p className="text-slate-400 text-sm">Dengan peluang spin 1-3x</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ Data ini hanya untuk testing. Anda bisa menghapus dan menambahkan data sendiri setelahnya.
            </p>
          </div>

          <Button
            onClick={setupSampleData}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
          >
            {loading ? 'Membuat Data...' : 'Buat Data Sample'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
