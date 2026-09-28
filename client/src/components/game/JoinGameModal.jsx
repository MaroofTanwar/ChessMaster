import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { KeyRound, Swords } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const JoinGameModal = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);

  const handleJoin = (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError('Please enter a game room code');
      return;
    }

    addToast(`Joining game room ${cleanCode}...`, 'info');
    onClose();
    navigate(`/multiplayer?room=${encodeURIComponent(cleanCode)}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Game Room"
      subtitle="Enter the room code shared by your opponent."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleJoin} className="flex flex-col gap-4 pt-2">
        <Input
          label="Room Code"
          type="text"
          placeholder="e.g. CM-8492"
          icon={KeyRound}
          value={code}
          error={error}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
        />

        <Button variant="cyan" type="submit" icon={Swords} className="w-full mt-2 py-3">
          Join Room
        </Button>
      </form>
    </Modal>
  );
};

export default JoinGameModal;
