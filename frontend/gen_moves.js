const faces = {
    U: { top: 'B[2], s.B[1], s.B[0]', right: 'R[2], s.R[1], s.R[0]', bottom: 'F[0], s.F[1], s.F[2]', left: 'L[0], s.L[1], s.L[2]' },
    D: { top: 'F[6], s.F[7], s.F[8]', right: 'R[6], s.R[7], s.R[8]', bottom: 'B[8], s.B[7], s.B[6]', left: 'L[8], s.L[7], s.L[6]' },
    F: { top: 'U[6], s.U[7], s.U[8]', right: 'R[0], s.R[3], s.R[6]', bottom: 'D[0], s.D[1], s.D[2]', left: 'L[2], s.L[5], s.L[8]' },
    B: { top: 'U[2], s.U[1], s.U[0]', right: 'L[0], s.L[3], s.L[6]', bottom: 'D[8], s.D[7], s.D[6]', left: 'R[2], s.R[5], s.R[8]' },
    L: { top: 'U[0], s.U[3], s.U[6]', right: 'F[0], s.F[3], s.F[6]', bottom: 'D[6], s.D[3], s.D[0]', left: 'B[2], s.B[5], s.B[8]' },
    R: { top: 'U[8], s.U[5], s.U[2]', right: 'B[0], s.B[3], s.B[6]', bottom: 'D[2], s.D[5], s.D[8]', left: 'F[2], s.F[5], s.F[8]' }
};

function gen(face, obj) {
    let out = `                case '${face}':\n`;
    out += `                    if (modifier === "'") {\n`;
    out += `                        const temp = [s.${obj.top}];\n`;
    out += `                        [s.${obj.top}] = [s.${obj.right}];\n`;
    out += `                        [s.${obj.right}] = reverse([s.${obj.bottom}]);\n`;
    out += `                        [s.${obj.bottom}] = [s.${obj.left}];\n`;
    out += `                        [s.${obj.left}] = reverse(temp);\n`;
    out += `                    } else if (modifier === '2') {\n`;
    out += `                        const temp = [s.${obj.top}];\n`;
    out += `                        [s.${obj.top}] = reverse([s.${obj.bottom}]);\n`;
    out += `                        [s.${obj.bottom}] = reverse(temp);\n`;
    out += `                        const tempR = [s.${obj.right}];\n`;
    out += `                        [s.${obj.right}] = reverse([s.${obj.left}]);\n`;
    out += `                        [s.${obj.left}] = reverse(tempR);\n`;
    out += `                    } else {\n`;
    out += `                        const temp = [s.${obj.top}];\n`;
    out += `                        [s.${obj.top}] = reverse([s.${obj.left}]);\n`;
    out += `                        [s.${obj.left}] = [s.${obj.bottom}];\n`;
    out += `                        [s.${obj.bottom}] = reverse([s.${obj.right}]);\n`;
    out += `                        [s.${obj.right}] = temp;\n`;
    out += `                    }\n`;
    out += `                    rotateFace(s.${face}, modifier);\n`;
    out += `                    break;\n`;
    return out;
}

let result = '';
for (const f of ['R', 'L', 'U', 'D', 'F', 'B']) {
    result += gen(f, faces[f]);
}
require('fs').writeFileSync('moves.txt', result);
console.log("Done");
