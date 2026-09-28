import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ConfirmResignModal({ isOpen, onClose, onConfirm }) {
  return <Modal isOpen={isOpen} onClose={onClose} title="Resign this game?" subtitle="Your opponent will win by resignation.">
    <div className="flex justify-end gap-2 pt-3"><Button variant="ghost" onClick={onClose}>Keep Playing</Button><Button variant="danger" onClick={() => { onClose(); onConfirm(); }}>Resign Game</Button></div>
  </Modal>;
}
