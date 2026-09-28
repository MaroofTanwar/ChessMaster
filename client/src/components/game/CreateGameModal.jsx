import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../../context/ToastContext';

export const CreateGameModal = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState('ranked');
  const createGame = () => {
    onClose();
    addToast('Connecting to the secure game server...', 'info');
    navigate(`/multiplayer?action=create&mode=${gameMode}`);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Multiplayer Room"
      subtitle="Invite another authenticated player to a private match." maxWidth="max-w-md">
      <div className="flex flex-col gap-5 pt-2 text-center">
        <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-500/20">
          <Swords className="w-9 h-9 text-purple-400 mx-auto mb-3" />
          <div className="font-bold text-slate-100">Rapid 10+0</div>
          <p className="text-xs text-slate-400 mt-2">You play White. The server generates the room ID, validates moves, and controls the clock.</p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Game mode">
          {['ranked', 'casual'].map((mode) => <button type="button" key={mode} onClick={() => setGameMode(mode)} className={`rounded-xl border px-4 py-3 text-sm font-bold capitalize ${gameMode === mode ? 'border-purple-400 bg-purple-500/20 text-purple-100' : 'border-white/10 bg-white/5 text-slate-400'}`}>{mode}<span className="block text-[10px] font-normal mt-1">{mode === 'ranked' ? 'Elo and stats apply' : 'No rating change'}</span></button>)}
        </div>
        <Button variant="primary" icon={Swords} onClick={createGame} className="w-full py-3">Create Secure Room</Button>
      </div>
    </Modal>
  );
};

export default CreateGameModal;
