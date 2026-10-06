import React, { useState } from 'react';
import { Bell, Check, Eye, RotateCcw, Settings, SlidersHorizontal, Volume2, Palette } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import { useSettings } from '../context/SettingsContext';
import { BOARD_THEMES } from '../config/settings';

export const SettingsPage = () => {
  const { settings, updateSetting, resetSettings, saveStatus } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const toggle = (key) => (value) => updateSetting(key, value);

  return <AppLayout>
    <Modal isOpen={confirmReset} onClose={() => setConfirmReset(false)} title="Reset personalization?" subtitle="Your account, rating, friends, and game history will not be changed.">
      <div className="flex justify-end gap-2 pt-3"><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { resetSettings(); setConfirmReset(false); }}>Reset to Defaults</Button></div>
    </Modal>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">Preferences & Settings</h1><p className="mt-1 text-sm text-slate-400">Personalize every ChessMaster board and game experience.</p></div>
        <div className="flex items-center gap-2"><span data-testid="settings-save-status" className={`text-xs ${saveStatus === 'error' ? 'text-rose-300' : 'text-slate-500'}`}>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Could not save' : ''}</span><Badge variant="purple" icon={Settings}>Personalization</Badge></div>
      </div>

      <Card className="p-5 sm:p-6"><h2 className="mb-4 flex items-center gap-2 font-bold text-slate-100"><Palette className="h-5 w-5 text-purple-400" />Appearance & Chess Board</h2>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Board theme</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Object.entries(BOARD_THEMES).map(([id, theme]) => <button type="button" key={id} data-testid={`theme-${id}`} onClick={() => updateSetting('boardTheme', id)} className={`rounded-xl border p-3 text-left transition-colors ${settings.boardTheme === id ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-slate-950/40 hover:border-white/20'}`}>
          <div className="mb-2 grid aspect-[2/1] grid-cols-4 overflow-hidden rounded-lg">{Array.from({ length: 8 }, (_, index) => <span key={index} style={{ background: (Math.floor(index / 4) + index % 4) % 2 ? theme.dark : theme.light }} />)}</div>
          <div className="flex items-center justify-between text-sm font-bold text-slate-200"><span>{theme.name}</span>{settings.boardTheme === id && <Check className="h-4 w-4 text-purple-300" />}</div>
        </button>)}</div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 p-4"><div className="text-sm font-semibold text-slate-200">Piece style: Premium Staunton</div><div className="text-xs text-slate-500">Dimensional ivory and ebony SVG pieces adapt their lighting to the selected board theme.</div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleSwitch label="Show Board Coordinates" description="Display files and ranks in the current orientation." checked={settings.showCoordinates} onChange={toggle('showCoordinates')} />
          <ToggleSwitch label="Show Legal Moves" description="Display move dots and capture rings without changing validation." checked={settings.showLegalMoves} onChange={toggle('showLegalMoves')} />
          <ToggleSwitch label="Highlight Last Move" description="Highlight the latest from and to squares." checked={settings.highlightLastMove} onChange={toggle('highlightLastMove')} />
          <ToggleSwitch label="Move Animations" description="Use subtle board transitions while respecting reduced-motion preferences." checked={settings.moveAnimations} onChange={toggle('moveAnimations')} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6"><h2 className="mb-4 flex items-center gap-2 font-bold text-slate-100"><SlidersHorizontal className="h-5 w-5 text-cyan-400" />Chess Preferences</h2><div className="flex flex-col gap-3">
          <ToggleSwitch label="Auto Queen" description="Automatically promote pawns to a queen. The server still validates multiplayer moves." checked={settings.autoQueen} onChange={toggle('autoQueen')} />
          <ToggleSwitch label="Confirm Before Resign" description="Ask for confirmation in AI and multiplayer games." checked={settings.confirmResign} onChange={toggle('confirmResign')} />
        </div></Card>
        <Card className="p-5 sm:p-6"><h2 className="mb-4 flex items-center gap-2 font-bold text-slate-100"><Volume2 className="h-5 w-5 text-cyan-400" />Sound</h2><div className="flex flex-col gap-3">
          <ToggleSwitch label="Master Sound" description="Silence all optional chess sounds." checked={settings.masterSound} onChange={toggle('masterSound')} />
          <ToggleSwitch label="Move Sounds" description="Play a sound for standard moves." checked={settings.moveSounds} onChange={toggle('moveSounds')} />
          <ToggleSwitch label="Capture Sounds" description="Play a distinct capture sound." checked={settings.captureSounds} onChange={toggle('captureSounds')} />
          <ToggleSwitch label="Check Sounds" description="Play an alert when a king is checked." checked={settings.checkSounds} onChange={toggle('checkSounds')} />
          <ToggleSwitch label="Game-End Sounds" description="Play the game-over chime." checked={settings.gameEndSounds} onChange={toggle('gameEndSounds')} />
        </div></Card>
      </div>

      <Card className="p-5 sm:p-6"><h2 className="mb-4 flex items-center gap-2 font-bold text-slate-100"><Bell className="h-5 w-5 text-amber-400" />Notifications</h2><ToggleSwitch label="In-App Notifications" description="Show optional friend and challenge toasts. Requests and challenges still arrive in the notification panel." checked={settings.inAppNotifications} onChange={toggle('inAppNotifications')} /></Card>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="flex items-center gap-2 font-bold text-slate-100"><Eye className="h-5 w-5 text-slate-400" />Application Theme</h2><p className="mt-1 text-xs text-slate-500">ChessMaster currently provides its fully supported premium dark interface.</p></div><Button variant="danger" icon={RotateCcw} onClick={() => setConfirmReset(true)}>Reset to Defaults</Button></Card>
    </div>
  </AppLayout>;
};

export default SettingsPage;
