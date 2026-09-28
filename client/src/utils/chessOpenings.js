// Lightweight ECO opening recognition lookup
export const OPENINGS = [
  { moves: 'e4 e5 Nf3 Nc6 Bb5', name: 'Ruy Lopez', eco: 'C60' },
  { moves: 'e4 e5 Nf3 Nc6 Bc4', name: 'Italian Game', eco: 'C50' },
  { moves: 'e4 e5 Nf3 Nc6 d4', name: 'Scotch Game', eco: 'C45' },
  { moves: 'e4 e5 Nf3 Nf6', name: "Petrov's Defense", eco: 'C42' },
  { moves: 'e4 e5 f4', name: "King's Gambit", eco: 'C30' },
  { moves: 'e4 e5', name: "King's Pawn Game", eco: 'C20' },
  { moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', name: 'Sicilian: Najdorf', eco: 'B90' },
  { moves: 'e4 c5 Nf3 Nc6', name: 'Sicilian Defense', eco: 'B30' },
  { moves: 'e4 c5', name: 'Sicilian Defense', eco: 'B20' },
  { moves: 'e4 e6 d4 d5', name: 'French Defense', eco: 'C01' },
  { moves: 'e4 e6', name: 'French Defense', eco: 'C00' },
  { moves: 'e4 c6 d4 d5', name: 'Caro-Kann Defense', eco: 'B12' },
  { moves: 'e4 c6', name: 'Caro-Kann Defense', eco: 'B10' },
  { moves: 'e4 d6', name: "Pirc Defense", eco: 'B07' },
  { moves: 'e4 d5', name: 'Scandinavian Defense', eco: 'B01' },
  { moves: 'e4 Nf6', name: "Alekhine's Defense", eco: 'B02' },
  { moves: 'd4 d5 c4 e6', name: "Queen's Gambit Declined", eco: 'D30' },
  { moves: 'd4 d5 c4 c6', name: 'Slav Defense', eco: 'D10' },
  { moves: 'd4 d5 c4 dxc4', name: "Queen's Gambit Accepted", eco: 'D20' },
  { moves: 'd4 d5 c4', name: "Queen's Gambit", eco: 'D06' },
  { moves: 'd4 d5 Bf4', name: 'London System', eco: 'D00' },
  { moves: 'd4 Nf6 Bf4', name: 'London System', eco: 'A48' },
  { moves: 'd4 Nf6 c4 g6', name: "King's Indian Defense", eco: 'E60' },
  { moves: 'd4 Nf6 c4 e6 Nc3 Bb4', name: 'Nimzo-Indian Defense', eco: 'E20' },
  { moves: 'd4 Nf6 c4 e6', name: 'Indian Defense', eco: 'E00' },
  { moves: 'd4 f5', name: 'Dutch Defense', eco: 'A80' },
  { moves: 'd4 d5', name: "Queen's Pawn Game", eco: 'D00' },
  { moves: 'c4 e5', name: 'English Opening: King’s English', eco: 'A20' },
  { moves: 'c4', name: 'English Opening', eco: 'A10' },
  { moves: 'Nf3 d5', name: 'Réti Opening', eco: 'A06' },
  { moves: 'Nf3', name: 'Zukertort Opening', eco: 'A04' },
  { moves: 'f4', name: "Bird's Opening", eco: 'A02' },
  { moves: 'b3', name: 'Nimzowitsch-Larsen Attack', eco: 'A01' },
];

export const detectOpening = (history) => {
  if (!history || history.length === 0) return null;
  const moveString = history.map((m) => m.san).join(' ');

  // Match the longest matching sequence
  let bestMatch = null;
  for (const opening of OPENINGS) {
    if (moveString.startsWith(opening.moves)) {
      if (!bestMatch || opening.moves.length > bestMatch.moves.length) {
        bestMatch = opening;
      }
    }
  }
  return bestMatch;
};
