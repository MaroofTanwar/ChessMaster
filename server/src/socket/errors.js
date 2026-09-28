export class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const cleanError = (error) => ({
  code: error instanceof GameError ? error.code : 'SERVER_ERROR',
  message: error instanceof GameError ? error.message : 'The game server could not complete that request.',
});
