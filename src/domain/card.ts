export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type FaceRank = 'J' | 'Q' | 'K';
export type NumberValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type NumberCard = { type: 'number'; suit: Suit; value: NumberValue };
export type FaceCard = { type: 'face'; suit: Suit; rank: FaceRank };
export type AceCard = { type: 'ace'; suit: Suit };
export type JokerCard = { type: 'joker'; id: 1 | 2 };

export type Card = NumberCard | FaceCard | AceCard | JokerCard;

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const NUMBER_VALUES: readonly NumberValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const FACE_RANKS: readonly FaceRank[] = ['J', 'Q', 'K'] as const;
