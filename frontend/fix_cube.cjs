const fs = require('fs');

const casesText = `                case 'R':
                    if (modifier === "'") {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = [s.B[0], s.B[3], s.B[6]];
                        [s.B[0], s.B[3], s.B[6]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = reverse(temp);
                        const tempR = [s.B[0], s.B[3], s.B[6]];
                        [s.B[0], s.B[3], s.B[6]] = reverse([s.F[2], s.F[5], s.F[8]]);
                        [s.F[2], s.F[5], s.F[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = reverse([s.F[2], s.F[5], s.F[8]]);
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = reverse([s.B[0], s.B[3], s.B[6]]);
                        [s.B[0], s.B[3], s.B[6]] = temp;
                    }
                    rotateFace(s.R, modifier);
                    break;
                case 'L':
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
                        [s.D[6], s.D[3], s.D[0]] = [s.B[2], s.B[5], s.B[8]];
                        [s.B[2], s.B[5], s.B[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
                        [s.D[6], s.D[3], s.D[0]] = reverse(temp);
                        const tempR = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
                        [s.B[2], s.B[5], s.B[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
                        [s.B[2], s.B[5], s.B[8]] = [s.D[6], s.D[3], s.D[0]];
                        [s.D[6], s.D[3], s.D[0]] = reverse([s.F[0], s.F[3], s.F[6]]);
                        [s.F[0], s.F[3], s.F[6]] = temp;
                    }
                    rotateFace(s.L, modifier);
                    break;
                case 'U':
                    if (modifier === "'") {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = [s.R[2], s.R[1], s.R[0]];
                        [s.R[2], s.R[1], s.R[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
                        [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
                        [s.F[0], s.F[1], s.F[2]] = reverse(temp);
                        const tempR = [s.R[2], s.R[1], s.R[0]];
                        [s.R[2], s.R[1], s.R[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
                        [s.L[0], s.L[1], s.L[2]] = reverse(tempR);
                    } else {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
                        [s.L[0], s.L[1], s.L[2]] = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = reverse([s.R[2], s.R[1], s.R[0]]);
                        [s.R[2], s.R[1], s.R[0]] = temp;
                    }
                    rotateFace(s.U, modifier);
                    break;
                case 'D':
                    if (modifier === "'") {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
                        [s.B[8], s.B[7], s.B[6]] = [s.L[8], s.L[7], s.L[6]];
                        [s.L[8], s.L[7], s.L[6]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
                        [s.B[8], s.B[7], s.B[6]] = reverse(temp);
                        const tempR = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
                        [s.L[8], s.L[7], s.L[6]] = reverse(tempR);
                    } else {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
                        [s.L[8], s.L[7], s.L[6]] = [s.B[8], s.B[7], s.B[6]];
                        [s.B[8], s.B[7], s.B[6]] = reverse([s.R[6], s.R[7], s.R[8]]);
                        [s.R[6], s.R[7], s.R[8]] = temp;
                    }
                    rotateFace(s.D, modifier);
                    break;
                case 'F':
                    if (modifier === "'") {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.D[0], s.D[1], s.D[2]]);
                        [s.D[0], s.D[1], s.D[2]] = [s.L[2], s.L[5], s.L[8]];
                        [s.L[2], s.L[5], s.L[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.D[0], s.D[1], s.D[2]]);
                        [s.D[0], s.D[1], s.D[2]] = reverse(temp);
                        const tempR = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = [s.D[0], s.D[1], s.D[2]];
                        [s.D[0], s.D[1], s.D[2]] = reverse([s.R[0], s.R[3], s.R[6]]);
                        [s.R[0], s.R[3], s.R[6]] = temp;
                    }
                    rotateFace(s.F, modifier);
                    break;
                case 'B':
                    if (modifier === "'") {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[8], s.D[7], s.D[6]] = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[8], s.D[7], s.D[6]] = reverse(temp);
                        const tempR = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse([s.R[2], s.R[5], s.R[8]]);
                        [s.R[2], s.R[5], s.R[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = reverse([s.R[2], s.R[5], s.R[8]]);
                        [s.R[2], s.R[5], s.R[8]] = [s.D[8], s.D[7], s.D[6]];
                        [s.D[8], s.D[7], s.D[6]] = reverse([s.L[0], s.L[3], s.L[6]]);
                        [s.L[0], s.L[3], s.L[6]] = temp;
                    }
                    rotateFace(s.B, modifier);
                    break;`;

let content = fs.readFileSync('src/modules/virtual_cube.ts', 'utf8');

function replaceSwitchBlock(content, funcName) {
    const startIndex = content.indexOf(`function ${funcName}(`);
    if (startIndex === -1) throw new Error(`Function ${funcName} not found`);
    
    const switchStart = content.indexOf(`switch(face) {`, startIndex);
    if (switchStart === -1) throw new Error(`switch(face) not found in ${funcName}`);
    
    const blockStart = content.indexOf(`\n`, switchStart) + 1;
    // Find the end of the switch block
    let nestLevel = 1;
    let blockEnd = -1;
    let inString = false;
    let stringChar = '';
    
    for (let i = switchStart + 13; i < content.length; i++) {
        const c = content[i];
        if (!inString) {
            if (c === "'" || c === '"' || c === '\`') {
                inString = true;
                stringChar = c;
            } else if (c === '{') {
                nestLevel++;
            } else if (c === '}') {
                nestLevel--;
                if (nestLevel === 0) {
                    // Back up to just before the closing brace, we want to replace the contents
                    blockEnd = content.lastIndexOf('\n', i) + 1;
                    break;
                }
            }
        } else {
            if (c === '\\') {
                i++; // Skip escaped char
            } else if (c === stringChar) {
                inString = false;
            }
        }
    }
    
    if (blockEnd === -1) throw new Error(`End of switch block not found in ${funcName}`);
    
    return content.substring(0, blockStart) + casesText + '\n' + content.substring(blockEnd);
}

content = replaceSwitchBlock(content, 'applyMove');
content = replaceSwitchBlock(content, 'applyBtMove');

fs.writeFileSync('src/modules/virtual_cube.ts', content);
console.log('Replaced switch blocks successfully.');
