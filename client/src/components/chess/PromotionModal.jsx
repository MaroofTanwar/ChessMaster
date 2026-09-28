import React from 'react';
import Modal from '../ui/Modal';
import Piece from './Piece';

export const PromotionModal = ({ isOpen, color = 'w', onSelect, onClose }) => {
  const choices = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pawn Promotion"
      subtitle="Select a piece to promote your pawn."
      maxWidth="max-w-sm"
    >
      <div className="grid grid-cols-4 gap-3 py-4">
        {choices.map((choice) => (
          <button
            key={choice.type}
            onClick={() => onSelect(choice.type)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-600/20 transition-all hover:scale-105 group shadow-lg"
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <Piece type={choice.type} color={color} />
            </div>
            <span className="text-xs font-bold text-slate-300 group-hover:text-purple-300 mt-1">
              {choice.label}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
};

export default PromotionModal;
