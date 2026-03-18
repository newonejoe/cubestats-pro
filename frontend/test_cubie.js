// We need to write a simple mapping function from ca/ea arrays (which cstimer parses) to a face state.
const cornerFacelet = [
  // URF
  ["U", 8, "R", 0, "F", 2],
  // UFL
  ["U", 6, "F", 0, "L", 2],
  // ULB
  ["U", 0, "L", 0, "B", 2],
  // UBR
  ["U", 2, "B", 0, "R", 2],
  // DFR
  ["D", 2, "F", 8, "R", 6],
  // DLF
  ["D", 0, "L", 8, "F", 6],
  // DBL
  ["D", 6, "B", 8, "L", 6],
  // DRB
  ["D", 8, "R", 8, "B", 6]
];

const edgeFacelet = [
  // UR
  ["U", 5, "R", 1],
  // UF
  ["U", 7, "F", 1],
  // UL
  ["U", 3, "L", 1],
  // UB
  ["U", 1, "B", 1],
  // DR
  ["D", 5, "R", 7],
  // DF
  ["D", 1, "F", 7],
  // DL
  ["D", 3, "L", 7],
  // DB
  ["D", 7, "B", 7],
  // FR
  ["F", 5, "R", 3],
  // FL
  ["F", 3, "L", 5],
  // BL
  ["B", 5, "L", 3],
  // BR
  ["B", 3, "R", 5]
];

function convert(ca, ea) {
  // Let's verify standard URF color mappings.
  // U=white, R=red, F=green, D=yellow, L=orange, B=blue
}
