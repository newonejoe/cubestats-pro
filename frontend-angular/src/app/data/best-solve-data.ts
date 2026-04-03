/**
 * Best solve algorithm suggestions from speedcubedb.com
 * Data loaded from assets/cube_cases_algs.csv
 * OLL: 57 cases (OLL 1 to OLL 57)
 * PLL: 21 cases (Aa, Ab, E, F, Ga, Gb, Gc, Gd, H, Ja, Jb, Na, Nb, Ra, Rb, T, Ua, Ub, V, Y, Z)
 * Each case has 5 algorithm suggestions
 */

export type CaseType = 'oll' | 'pll';

export interface CaseBestSolve {
  caseType: CaseType;
  caseIndex: number;
  bestSolves: string[];
  selectedSolve: number;
  execTarget: number | null;
  execBest: number | null;
}

/** PLL name to index mapping */
const PLL_NAME_TO_INDEX: Record<string, number> = {
  'Aa': 0, 'Ab': 1, 'E': 2, 'F': 3, 'Ga': 4, 'Gb': 5, 'Gc': 6, 'Gd': 7,
  'H': 8, 'Ja': 9, 'Jb': 10, 'Na': 11, 'Nb': 12, 'Ra': 13, 'Rb': 14,
  'T': 15, 'Ua': 16, 'Ub': 17, 'V': 18, 'Y': 19, 'Z': 20
};

/** OLL name to index mapping (OLL 1 = index 1, etc. - index 0 is OLL skip) */
function ollNameToIndex(name: string): number | null {
  const match = name.match(/OLL (\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Parse CSV data and build algorithm maps
 * CSV format: Set,Case ID,Alg 1,Alg 2,Alg 3,Alg 4,Alg 5
 */
function parseAlgorithms(csvContent: string): { oll: Record<number, string[]>, pll: Record<number, string[]> } {
  const lines = csvContent.trim().split('\n');
  const ollMap: Record<number, string[]> = {};
  const pllMap: Record<number, string[]> = {};

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV - handle commas within quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length < 7) continue;

    const set = parts[0];
    const caseId = parts[1];
    const algs = [parts[2], parts[3], parts[4], parts[5], parts[6]].filter(a => a && a.trim());

    if (algs.length === 0) continue;

    if (set === 'PLL') {
      const index = PLL_NAME_TO_INDEX[caseId];
      if (index !== undefined) {
        pllMap[index] = algs;
      }
    } else if (set === 'OLL') {
      const index = ollNameToIndex(caseId);
      if (index !== null && index >= 1 && index <= 57) {
        ollMap[index] = algs;
      }
    }
  }

  return { oll: ollMap, pll: pllMap };
}

// Embedded CSV data - parsed at build time
const CSV_DATA = `Set,Case ID,Alg 1,Alg 2,Alg 3,Alg 4,Alg 5
PLL,Aa,x (R' U R') D2 (R U' R') D2 R2 x',x R' U R' D2 R U' R' D2 R2 x',y' x L2 D2 L' U' L D2 L' U L',l' U R' D2 R U' R' D2 R2 x',y x' R2 D2 R' U' R D2 R' U R' x
PLL,Ab,x R2 D2 (R U R') D2 (R U' R) x',x R2 D2 R U R' D2 R U' R x',y' x L U' L D2 L' U L D2 L2,y x' R U' R D2 R' U R D2 R2 x,R' B' R U' R D R' U R D' R2 B R
PLL,E,y x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x,y x' R U' R' D R U R' D' R U R' D R U' R' D' x,y R' U' R' D' R U' R' D R U R' D' R U R' D R2,R2 U F' R' U R U' R' U R U' R' U R U' F U' R2,y x' L' U L D' L' U' L D L' U' L D' L' U L D
PLL,F,y (R' U' F') (R U R' U') R' F R2 (U' R' U') (R U R' U) R,y R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R,y R' F R f' R' F R2 U R' U' R' F' R2 U R' S,R' U R U' R2 F' U' F U R F R' F' R2,y R2 F R F' R' U' F' U F R2 U R' U' R
PLL,Ga,R2 (U R' U R' U' R U') R2 D (U' R' U R) D',R2 U R' U R' U' R U' R2 D U' R' U R D',R2 u R' U R' U' R u' R2 F' U F,y R U R' F' R U R' U' R' F R U' R' F R2 U' R' U' R U R' F',D' R2 U R' U R' U' R U' R2 U' D R' U R
PLL,Gb,(R' U' R U) D' R2 (U R' U R U' R U') R2 D,D R' U' R U D' R2 U R' U R U' R U' R2,R' U' R U D' R2 U R' U R U' R U' R2 D,y F' U' F R2 u R' U R U' R u' R2,R' d' F R2 u R' U R U' R u' R2
PLL,Gc,R2 (U' R U' R U R' U) R2 D' (U R U' R') D,R2 U' R U' R U R' U R2 D' U R U' R',y2 R2 F2 R U2 R U2 R' F R U R' U' R' F R2,D R2 U' R U' R U R' U R2 D' U R U' R',R2 u' R U' R U R' u R2 f R' f'
PLL,Gd,(R U R' U') D R2 (U' R U' R' U R' U) R2 D',R U R' U' D R2 U' R U' R' U R' U R2 D',D' R U R' U' D R2 U' R U' R' U R' U R2,R U R' y' R2 u' R U' R' U R' u R2,y R2 F' R U R U' R' F' R U2 R' U2 R' F2 R2
PLL,H,(M2 U' M2) U2 (M2 U' M2),M2 U' M2 U2 M2 U' M2,M2 U M2 U2 M2 U M2,R2 S2 R2 U' R2 S2 R2,M2 U2 M2 U M2 U2 M2
PLL,Ja,y (R' U L') U2 (R U' R') U2 R L,y2 x R2 F R F' R U2 r' U r U2 x',y R' U L' U2 R U' R' U2 R L,L' U' L F L' U' L U L F' L2 U L,R U' L' U R' U2 L U' L' U2 L
PLL,Jb,(R U R' F') (R U R' U') R' F R2 U' R',R U R' F' R U R' U' R' F R2 U' R',R U2 R' U' R U2 L' U R' U' L,r' F R F' r U2 R' U R U2 R',L' U R U' L U2 R' U R U2 R'
PLL,Na,(R U R' U) (R U R' F') (R U R' U') R' F R2 U' R' U2 (R U' R'),R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R',F' R U R' U' R' F R2 F U' R' U' R U F' R',R F U' R' U R U F' R2 F' R U R U' R' F,r' D r U2 r' D r U2 r' D r U2 r' D r U2 r' D r
PLL,Nb,(R' U R U' R') (F' U' F) (R U R') (F R' F') (R U' R),R' U R U' R' F' U' F R U R' F R' F' R U' R,r' D' F r U' r' F' D r2 U r' U' r' F r F',R' U L' U2 R U' L R' U L' U2 R U' L,R' U R U' R' F' U' F R U R' U' R U' f R f'
PLL,Ra,y (R U' R' U') (R U R D) (R' U' R D') (R' U2 R'),y R U' R' U' R U R D R' U' R D' R' U2 R',y R U R' F' R U2 R' U2 R' F R U R U2 R',L U2 L' U2 L F' L' U' L U L F L2,y R U' R' U' R U R' U R' D' R U' R' D R2 U R'
PLL,Rb,(R' U2) (R U2) (R' F R) (U R' U' R') F' R2,R' U2 R U2 R' F R U R' U' R' F' R2,y R2 F R U R U' R' F' R U2 R' U2 R,R' U2 R' D' R U' R' D R U R U' R' U' R,y R' U R U R' U' R' D' R U R' D R U2 R
PLL,T,(R U R' U') (R' F R2) (U' R' U') (R U R' F'),R U R' U' R' F R2 U' R' U' R U R' F',l b d' L' U' F U2 L' U' L' U L U' f' S M r u E U' R',R U R' U' R' F R2 U' R' U F' L' U L,R2 u R2 u' R2 F2 u' F2 u F2
PLL,Ua,y2 (M2 U M) U2 (M' U M2),y2 M2 U M U2 M' U M2,R U R' U R' U' R2 U' R' U R' U R,y R2 U' S' U2 S U' R2,y2 R U' R U R U R U' R' U' R2
PLL,Ub,y2 (M2 U' M) U2 (M' U' M2),y2 M2 U' M U2 M' U' M2,R' U R' U' R' U' R' U R U R2,R2' U R U R' U' R3 U' R' U R',y2 R2 U R U R' U' R' U' R' U R'
PLL,V,(R' U R' U') (R D' R' D) (R' U D') (R2 U' R2) D R2,R' U R' U' R D' R' D R' U D' R2 U' R2 D R2,R' U R U' R' f' U' R U2 R' U' R U' R' f R,y R U' R U R' D R D' R U' D R2 U R2 D' R2,R' U R' U' y R' F' R2 U' R' U R' F R F
PLL,Y,F R (U' R' U') (R U R' F') (R U R' U') (R' F R F'),F R U' R' U' R U R' F' R U R' U' R' F R F',F R' F R2 U' R' U' R U R' F' R U R' U' F',R2 U' R2 U' R2 U F U F' R2 F U' F',F R' F' R U R U' R2 U' R U R f' U' f
PLL,Z,(M2 U) (M2 U) (M' U2) M2 (U2 M'),M' U' M2 U' M2 U' M' U2 M2,M2 U M2 U M' U2 M2 U2 M',y M2 U' M2 U' M' U2 M2 U2 M',y M' U M2 U M2 U M' U2 M2
OLL,OLL 1,(R U2 R') (R' F R F') U2 (R' F R F'),R U2 R2 F R F' U2 R' F R F',y R U' R2 D' r U' r' D R2 U R',f R U R' U' R f' U' r' U' R U M',L' U2 L2 F' L' F U2 L F' L' F
OLL,OLL 2,F (R U R' U') F' f (R U R' U') f',y' R U' R2 D' r U r' D R2 U R',F R U R' U' S R U R' U' f',F R U R' U' F' f R U R' U' f',y r U r' U2 R U2 R' U2 r U' r'
OLL,OLL 3,y' f (R U R' U') f' (U') F (R U R' U') F',y' f R U R' U' f' U' F R U R' U' F',y R' F2 R2 U2 R' F R U2 R2 F2 R,r' R2 U R' U r U2 r' U M',M R U R' U r U2 r' U M'
OLL,OLL 4,y' f (R U R' U') f' (U) F (R U R' U') F',y' R' F2 R2 U2 R' F' R U2 R2 F2 R,y' f R U R' U' f' U F R U R' U' F',R' F R F' U' S R' U' R U R S',y F U R U' R' F' U' F R U R' U' F'
OLL,OLL 5,r' U2 (R U R' U) r,r' U2 R U R' U r,y2 l' U2 L U L' U l,y2 R' F2 r U r' F R,y2 R' F2 L F L' F R
OLL,OLL 6,r U2 (R' U' R U') r',r U2 R' U' R U' r',F U' R2 D R' U' R D' R2 U F',y2 l U2 L' U' L U' l',y' x' D R2 U' R' U R' D' x
OLL,OLL 7,r (U R' U R) U2 r',r U R' U R U2 r',S' R U R' U R U2 R' U S,L' U2 L U2 L F' L' F,y2 l U L' U L U2 l'
OLL,OLL 8,y2 r' (U' R U' R') U2 r,y2 r' U' R U' R' U2 r,l' U' L U' L' U2 l,R U2 R' U2 R' F R F',R' F' r U' r' F2 R
OLL,OLL 9,y (R U R' U') (R' F R) (R U R' U') F',y R U R' U' R' F R2 U R' U' F',R U2 R' U' S' R U' R' S,y2 F' U' F r U' r' U r U r',y' L' U' L U' L F' L' F L' U2 L
OLL,OLL 10,(R U R' U) (R' F R F') (R U2 R'),R U R' U R' F R F' R U2 R',y F U F' R' F R U' R' F' R,y M' R' U2 R U R' U R U M,y2 L' U' L U L F' L2 U' L U F
OLL,OLL 11,M (R U R' U R U2 R') U M',r' R2 U R' U R U2 R' U M',y2 r U R' U R' F R F' R U2 r',S R U R' U R U2 R' U2 S',M R U R' U R U2 R' U M'
OLL,OLL 12,y' M' (R' U' R U' R' U2 R) U' M,y' M' R' U' R U' R' U2 R U' M,F R U R' U' F' U F R U R' U' F',y' S R' U' R U' R' U2 R U2 S',y l L2 U' L U' L' U2 L U' M'
OLL,OLL 13,(r U' r') U' (r U r') (F' U F),F U R U2 R' U' R U R' F',F U R U' R2 F' R U R U' R',r U' r' U' r U r' F' U F,r U' r' U' r U r' y L' U L
OLL,OLL 14,R' F (R U R') F' R (F U' F'),R' F R U R' F' R F U' F',r U R' U' r' F R2 U R' U' F',F' U' L' U L2 F L' U' L' U L,l' U l U l' U' l F U' F'
OLL,OLL 15,(r' U' r) (R' U' R U) (r' U r),r' U' r R' U' R U r' U r,y2 l' U' l L' U' L U l' U l,r' U' M' U' R U r' U r,y2 R' F' R L' U' L U R' F R
OLL,OLL 16,(r U r') (R U R' U') (r U' r'),r U r' R U R' U' r U' r',r U M U R' U' r U' r',y2 R' F R U R' U' F' R U' R' U2 R,y2 l U l' L U L' U' l U' l'
OLL,OLL 17,(R U R' U) (R' F R F') U2 (R' F R F'),R U R' U R' F R F' U2 R' F R F',y2 F R' F' R U S' R U' R' S,y2 F R' F' R2 r' U R U' R' U' M',y' F' r U r' U' S r' F r S'
OLL,OLL 18,y (R U2 R') (R' F R F') U2 M' (U R U' r'),y R U2 R2 F R F' U2 M' U R U' r',r U R' U R U2 r2 U' R U' R' U2 r,y F S' R U' R' S R U2 R' U' F',R D r' U' r D' R' U' R2 F R F' R
OLL,OLL 19,M U (R U R' U') M' (R' F R F'),y S' R U R' S U' R' F R F',M U R U R' U' M' R' F R F',R' U2 F R U R' U' F2 U2 F R,r' R U R U R' U' r R2 F R F'
OLL,OLL 20,(r U R' U') M2 (U R U' R') U' M',r U R' U' M2 U R U' R' U' M',M' U2 M U2 M' U M U2 M' U2 M,S' R U R' S U' M' U R U' r',S R' U' R U R U R U' R' S'
OLL,OLL 21,(R U R' U) (R U' R' U) (R U2 R'),R U R' U R U' R' U R U2 R',y R U2 R' U' R U R' U' R U' R',y F R U R' U' R U R' U' R U R' U' F',R' U' R U' R' U R U' R' U2 R
OLL,OLL 22,R U2 (R2' U') (R2 U') (R2' U') U' R,R U2 R2 U' R2 U' R2 U2 R,R' U2 R2 U R2 U R2 U2 R',f R U R' U' S' R U R' U' F',f R U R' U' f' F R U R' U' F'
OLL,OLL 23,R2 D (R' U2 R) D' (R' U2 R'),R2 D R' U2 R D' R' U2 R',y2 R2 D' R U2 R' D R U2 R,R U R' U R U2 R2 U' R U' R' U2 R,y R U R' U' R U' R' U2 R U' R' U2 R U R'
OLL,OLL 24,(r U R' U') (r' F R F'),r U R' U' r' F R F',y2 R' F' r U R U' r' F,y' x' R U R' D R U' R' D' x,y R U R D R' U' R D' R2
OLL,OLL 25,y (F' r U R') (U' r' F R),R U2 R D R' U2 R D' R2,y F' r U R' U' r' F R,F R' F' r U R U' r',x R' U R D' R' U' R D x'
OLL,OLL 26,y R U2 (R' U' R U') R',y R U2 R' U' R U' R',R' U' R U' R' U2 R,y2 L' U' L U' L' U2 L,y2 L' U R U' L U R'
OLL,OLL 27,(R U R' U) (R U2 R'),R U R' U R U2 R',y' R' U2 R U R' U R,y L' U2 L U L' U L,y2 L U L' U L U2 L'
OLL,OLL 28,(r U R' U') M (U R U' R'),r U R' U' M U R U' R',R' F R S R' F' R S',r U R' U' r' R U R U' R',y2 M' U M U2 M' U M
OLL,OLL 29,y (R U R') U' (R U' R') (F' U' F) (R U R'),r2 D' r U r' D r2 U' r' U' r,y R U R' U' R U' R' F' U' F R U R',y S' R U R' U' R' F R F' U S,M U R U R' U' R' F R F' M'
OLL,OLL 30,y2 F U (R U2 R') U' (R U2 R') U' F',y' r' D' r U' r' D r2 U' r' U r U r',y2 F U R U2 R' U' R U2 R' U' F',y2 F R' F R2 U' R' U' R U R' F2,y S' R' U' R f R' U R U' F'
OLL,OLL 31,(R' U' F) (U R U' R') F' R,R' U' F U R U' R' F' R,y2 S' L' U' L U L F' L' f,y S R U R' U' f' U' F,y' F R' F' R U R U R' U' R U' R'
OLL,OLL 32,S (R U R' U') (R' F R f'),S R U R' U' R' F R f',y2 L U F' U' L' U L F L',R U B' U' R' U R B R',y' R' F R F' U' r U' r' U r U r'
OLL,OLL 33,(R U R' U') (R' F R F'),R U R' U' R' F R F',y2 L' U' L U L F' L' F,y2 r' F' r U r U' r' F,R U R' F' U' F R U' R'
OLL,OLL 34,y2 R U R2 U' R' F (R U R U') F',y f R f' U' r' U' R U M',y2 R U R2 U' R' F R U R U' F',F R U R' U' R' F' r U R U' r',y2 R U R' U' B' R' F R F' B
OLL,OLL 35,(R U2 R') (R' F R F') (R U2 R'),R U2 R2 F R F' R U2 R',f R U R' U' f' R U R' U R U2 R',y L' U2 L2 F' L' F L' U2 L,R U2 R' d' R' F R U' R' F' R
OLL,OLL 36,y2 (L' U' L U') (L' U L U) (L F' L' F),y R U R2 F' U' F U R2 U2 R',y2 L' U' L U' L' U L U L F' L' F,y2 R U R' F' R U R' U' R' F R U' R' F R F',y2 R' F' U' F2 U R U' R' F' R
OLL,OLL 37,F R (U' R' U') (R U R') F',F R' F' R U R U' R',F R U' R' U' R U R' F',y F' r U r' U' r' F r,y2 r2 D' r U' r' D r U r
OLL,OLL 38,(R U R' U) (R U' R' U') (R' F R F'),R U R' U R U' R' U' R' F R F',y F R U' R' S U' R U R' f',r U R' U' r' F R U R U' R' F',y2 L U L' U L U' L' U' L' B L B'
OLL,OLL 39,y L F' (L' U' L U) F U' L',y' f' r U r' U' r' F r S,y' R U R' F' U' F U R U2 R',y L F' L' U' L U F U' L',y' f' L F L' U' L' U L S
OLL,OLL 40,y R' F (R U R' U') F' U R,y R' F R U R' U' F' U R,y' f R' F' R U R U' R' S',R r D r' U r D' r' U' R',y' L' U' L F U F' U' L' U2 L
OLL,OLL 41,y2 (R U R' U) (R U2 R') F (R U R' U') F',y2 R U R' U R U2 R' F R U R' U' F',y2 F U R2 D R' U' R D' R2 F',y' S U' R' F' U' F U R S',M U' F' L' U' L U F M'
OLL,OLL 42,(R' U' R U') (R' U2 R) F (R U R' U') F',R' U' R U' R' U2 R F R U R' U' F',y F S' R U R' U' F' U S,y R' F R F' R' F R F' R U R' U' R U R',y R' U' F2 u' R U R' D R2 B
OLL,OLL 43,y R' U' (F' U F) R,y R' U' F' U F R,y2 F' U' L' U L F,f' L' U' L U f,B' U' R' U R B
OLL,OLL 44,f (R U R' U') f',f R U R' U' f',y2 F U R U' R' F',y R U B U' B' R',y' L U F U' F' L'
OLL,OLL 45,F (R U R' U') F',F R U R' U' F',y R' F' U' F U R,y2 f U R U' R' f',y2 F' L' U' L U F
OLL,OLL 46,R' U' (R' F R F') U R,R' U' R' F R F' U R,R' F' U' F R U' R' U2 R,y F R U R' U' F' U' R U R' U R U2 R',l' U2 L2 F' L' F U L' U l
OLL,OLL 47,F' (L' U' L U) (L' U' L U) F,y' F R' F' R U2 R U' R' U R U2 R',F' L' U' L U L' U' L U F,R' U' R' F R F' R' F R F' U R,y' R' F' U' F U F' U' F U R
OLL,OLL 48,F (R U R' U') (R U R' U') F',F R U R' U' R U R' U' F',y2 f U R U' R' U R U' R' f',R U2 R' U' R U R' U2 R' F R F',F R' F' U2 R U R' U R2 U2 R'
OLL,OLL 49,y2 r U' (r2 U) (r2 U) (r2) U' r,y2 r U' r2 U r2 U r2 U' r,l U' l2 U l2 U l2 U' l,R B' R2 F R2 B R2 F' R,y2 R' F R' F' R2 U2 B' R B R'
OLL,OLL 50,r' U (r2 U') (r2 U') (r2) U r',r' U r2 U' r2 U' r2 U r',y2 R' F R2 B' R2 F' R2 B R',y' R U2 R' U' R U' R' F R U R' U' F',y2 l' U l2 U' l2 U' l2 U l'
OLL,OLL 51,f (R U R' U') (R U R' U') f',y2 F U R U' R' U R U' R' F',f R U R' U' R U R' U' f',y' R' U' R' F R F' R U' R' U2 R,y r' F' U' F U F' U' F U r
OLL,OLL 52,y2 R' (F' U' F U') (R U R' U) R,y2 R' F' U' F U' R U R' U R,R U R' U R U' B U' B' R',R U R' U R d' R U' R' F',R U R' U R U' y R U' R' F'
OLL,OLL 53,(r' U' R U') (R' U R U') (R' U2 r),r' U' R U' R' U R U' R' U2 r,y2 l' U' L U' L' U L U' L' U2 l,y r' U2 R U R' U' R U R' U r,y' l' U2 L U L' U' L U L' U l
OLL,OLL 54,(r U R' U) (R U' R' U) (R U2 r'),r U R' U R U' R' U R U2 r',y' r U2 R' U' R U R' U' R U' r',y' r U r' R U R' U' R U R' U' r U' r',y2 l U L' U L U' L' U L U2 l'
OLL,OLL 55,R U2 R2 (U' R U' R') U2 (F R F'),y R' F U R U' R2 F' R2 U R' U' R,y R' F R U R U' R2 F' R2 U' R' U R U R',R U2 R2 U' R U' R' U2 F R F',r U2 R2 F R F' U2 r' F R F'
OLL,OLL 56,(r U r') (U R U' R') (U R U' R') (r U' r'),r U r' U R U' R' U R U' R' r U' r',r U r' U R U' R' M' U R U2 r',F R U R' U' R F' r U R' U' r',r' U' r U' R' U R U' R' U R r' U r
OLL,OLL 57,(R U R' U') M' (U R U' r'),R U R' U' M' U R U' r',y R U' R' S' R U R' S,y R U R' S' R U' R' S,R U R' U' R' r U R U' r'`;

// Parse once at module load
const { oll: OLL_ALGORITHMS, pll: PLL_ALGORITHMS } = parseAlgorithms(CSV_DATA);

/**
 * Get algorithm list for a case
 */
export function getAlgorithms(type: CaseType, index: number): string[] | null {
  if (type === 'oll') {
    return OLL_ALGORITHMS[index] ?? null;
  } else if (type === 'pll') {
    return PLL_ALGORITHMS[index] ?? null;
  }
  return null;
}

/**
 * Check if a case has algorithm data
 */
export function hasAlgorithmData(type: CaseType, index: number): boolean {
  return getAlgorithms(type, index) !== null;
}