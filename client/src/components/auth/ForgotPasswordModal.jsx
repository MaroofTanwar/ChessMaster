import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Mail, KeyRound } from 'lucide-react';
import { forgotPasswordApi } from '../../api/auth.api';
import { useToast } from '../../context/ToastContext';

export const ForgotPasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleClose = () => {
    if (isLoading) return;
    setEmail('');
    setError(null);
    onClose();
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await forgotPasswordApi(email);
      addToast('If an account exists, a password reset link has been sent. Check your inbox and spam folder.', 'success', 8000);
      onSuccess?.(email.trim());
      setEmail('');
      onClose();
    } catch (error) {
      setError(error.message);
      addToast(error.message, 'error');
    } finally { setIsLoading(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Your Password"
      subtitle="Enter your email to receive a secure password reset link." maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
        <Input label="Registered Email" type="email" placeholder="you@example.com" icon={Mail}
          value={email} error={error} onChange={(event) => { setEmail(event.target.value); setError(null); }} />
        <Button variant="primary" type="submit" isLoading={isLoading} icon={KeyRound} className="w-full mt-2 py-3">
          Send Reset Link
        </Button>
      </form>
    </Modal>
  );
};
export default ForgotPasswordModal;