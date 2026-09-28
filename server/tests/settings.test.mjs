import test from 'node:test';
import assert from 'node:assert/strict';
import { validSettings } from '../src/services/settingsSchema.js';

const settings = {
  boardTheme: 'ocean', pieceStyle: 'standard', showCoordinates: false,
  showLegalMoves: true, highlightLastMove: true, moveAnimations: true,
  autoQueen: false, confirmResign: true, masterSound: true, moveSounds: true,
  captureSounds: true, checkSounds: true, gameEndSounds: true, inAppNotifications: false,
};

test('settings validation accepts only the complete allowlisted schema', () => {
  assert.equal(validSettings(settings), true);
  assert.equal(validSettings({ ...settings, rating: 9999 }), false);
  assert.equal(validSettings({ ...settings, boardTheme: 'forged' }), false);
  assert.equal(validSettings({ ...settings, autoQueen: 'yes' }), false);
  const { moveSounds, ...missing } = settings;
  assert.equal(validSettings(missing), false);
});
