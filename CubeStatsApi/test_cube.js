// Test script for cube scramble logic

function createSolvedCube() {
    return {
        U: Array(9).fill('white'),
        D: Array(9).fill('yellow'),
        R: Array(9).fill('red'),
        L: Array(9).fill('orange'),
        F: Array(9).fill('green'),
        B: Array(9).fill('blue')
    };
}

function rotateFace(face, modifier) {
    if (modifier === "'") {
        const temp = [face[0], face[1], face[2], face[3], face[4], face[5], face[6], face[7], face[8]];
        face[0] = temp[6]; face[1] = temp[3]; face[2] = temp[0];
        face[3] = temp[7]; face[4] = temp[4]; face[5] = temp[1];
        face[6] = temp[8]; face[7] = temp[5]; face[8] = temp[2];
    } else if (modifier === '2') {
        const temp = [face[0], face[1], face[2], face[3], face[4], face[5], face[6], face[7], face[8]];
        face[0] = temp[8]; face[1] = temp[7]; face[2] = temp[6];
        face[3] = temp[5]; face[4] = temp[4]; face[5] = temp[3];
        face[6] = temp[2]; face[7] = temp[1]; face[8] = temp[0];
    } else {
        const temp = [face[0], face[1], face[2], face[3], face[4], face[5], face[6], face[7], face[8]];
        face[0] = temp[6]; face[1] = temp[3]; face[2] = temp[0];
        face[3] = temp[7]; face[4] = temp[4]; face[5] = temp[1];
        face[6] = temp[8]; face[7] = temp[5]; face[8] = temp[2];
    }
}

const reverse = arr => [arr[2], arr[1], arr[0]];

function applyMove(s, face, modifier) {
    switch(face) {
        case 'R':
            if (modifier === "'") {
                const temp = [s.U[2], s.U[5], s.U[8]];
                [s.U[2], s.U[5], s.U[8]] = [s.F[2], s.F[5], s.F[8]];
                [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                [s.D[2], s.D[5], s.D[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                [s.B[6], s.B[3], s.B[0]] = reverse(temp);
            } else if (modifier === '2') {
                const temp = [s.U[2], s.U[5], s.U[8]];
                [s.U[2], s.U[5], s.U[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                [s.B[6], s.B[3], s.B[0]] = reverse(temp);
                const tempF = [s.F[2], s.F[5], s.F[8]];
                [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                [s.D[2], s.D[5], s.D[8]] = tempF;
            } else {
                const temp = [s.U[2], s.U[5], s.U[8]];
                [s.U[2], s.U[5], s.U[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                [s.B[6], s.B[3], s.B[0]] = reverse([s.D[2], s.D[5], s.D[8]]);
                [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
                [s.F[2], s.F[5], s.F[8]] = temp;
            }
            rotateFace(s.R, modifier);
            break;
        case 'L':
            if (modifier === "'") {
                const temp = [s.U[0], s.U[3], s.U[6]];
                [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
                [s.F[0], s.F[3], s.F[6]] = [s.D[0], s.D[3], s.D[6]];
                [s.D[0], s.D[3], s.D[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                [s.B[8], s.B[5], s.B[2]] = reverse(temp);
            } else if (modifier === '2') {
                const temp = [s.U[0], s.U[3], s.U[6]];
                [s.U[0], s.U[3], s.U[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                [s.B[8], s.B[5], s.B[2]] = reverse(temp);
                const tempF = [s.F[0], s.F[3], s.F[6]];
                [s.F[0], s.F[3], s.F[6]] = [s.D[0], s.D[3], s.D[6]];
                [s.D[0], s.D[3], s.D[6]] = tempF;
            } else {
                const temp = [s.U[0], s.U[3], s.U[6]];
                [s.U[0], s.U[3], s.U[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                [s.B[8], s.B[5], s.B[2]] = reverse([s.D[0], s.D[3], s.D[6]]);
                [s.D[0], s.D[3], s.D[6]] = [s.F[0], s.F[3], s.F[6]];
                [s.F[0], s.F[3], s.F[6]] = temp;
            }
            rotateFace(s.L, modifier);
            break;
        case 'U':
            if (modifier === "'") {
                const temp = [s.F[0], s.F[1], s.F[2]];
                [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
                [s.L[0], s.L[1], s.L[2]] = [s.B[0], s.B[1], s.B[2]];
                [s.B[0], s.B[1], s.B[2]] = [s.R[0], s.R[1], s.R[2]];
                [s.R[0], s.R[1], s.R[2]] = temp;
            } else if (modifier === '2') {
                const temp = [s.F[0], s.F[1], s.F[2]];
                [s.F[0], s.F[1], s.F[2]] = [s.B[0], s.B[1], s.B[2]];
                [s.B[0], s.B[1], s.B[2]] = temp;
                const tempR = [s.R[0], s.R[1], s.R[2]];
                [s.R[0], s.R[1], s.R[2]] = [s.L[0], s.L[1], s.L[2]];
                [s.L[0], s.L[1], s.L[2]] = tempR;
            } else {
                const temp = [s.F[0], s.F[1], s.F[2]];
                [s.F[0], s.F[1], s.F[2]] = [s.R[0], s.R[1], s.R[2]];
                [s.R[0], s.R[1], s.R[2]] = [s.B[0], s.B[1], s.B[2]];
                [s.B[0], s.B[1], s.B[2]] = [s.L[0], s.L[1], s.L[2]];
                [s.L[0], s.L[1], s.L[2]] = temp;
            }
            rotateFace(s.U, modifier);
            break;
        case 'D':
            if (modifier === "'") {
                const temp = [s.F[6], s.F[7], s.F[8]];
                [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
                [s.R[6], s.R[7], s.R[8]] = [s.B[6], s.B[7], s.B[8]];
                [s.B[6], s.B[7], s.B[8]] = [s.L[6], s.L[7], s.L[8]];
                [s.L[6], s.L[7], s.L[8]] = temp;
            } else if (modifier === '2') {
                const temp = [s.F[6], s.F[7], s.F[8]];
                [s.F[6], s.F[7], s.F[8]] = [s.B[6], s.B[7], s.B[8]];
                [s.B[6], s.B[7], s.B[8]] = temp;
                const tempR = [s.R[6], s.R[7], s.R[8]];
                [s.R[6], s.R[7], s.R[8]] = [s.L[6], s.L[7], s.L[8]];
                [s.L[6], s.L[7], s.L[8]] = tempR;
            } else {
                const temp = [s.F[6], s.F[7], s.F[8]];
                [s.F[6], s.F[7], s.F[8]] = [s.L[6], s.L[7], s.L[8]];
                [s.L[6], s.L[7], s.L[8]] = [s.B[6], s.B[7], s.B[8]];
                [s.B[6], s.B[7], s.B[8]] = [s.R[6], s.R[7], s.R[8]];
                [s.R[6], s.R[7], s.R[8]] = temp;
            }
            rotateFace(s.D, modifier);
            break;
        case 'F':
            if (modifier === "'") {
                const temp = [s.U[6], s.U[7], s.U[8]];
                [s.U[6], s.U[7], s.U[8]] = reverse([s.R[0], s.R[3], s.R[6]]);
                [s.R[0], s.R[3], s.R[6]] = [s.D[2], s.D[1], s.D[0]];
                [s.D[0], s.D[1], s.D[2]] = reverse([s.L[8], s.L[5], s.L[2]]);
                [s.L[2], s.L[5], s.L[8]] = reverse(temp);
            } else if (modifier === '2') {
                const temp = [s.U[6], s.U[7], s.U[8]];
                [s.U[6], s.U[7], s.U[8]] = [s.D[0], s.D[1], s.D[2]];
                [s.D[0], s.D[1], s.D[2]] = temp;
                const tempR = [s.R[0], s.R[3], s.R[6]];
                [s.R[0], s.R[3], s.R[6]] = reverse([s.L[8], s.L[5], s.L[2]]);
                [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
            } else {
                const temp = [s.U[6], s.U[7], s.U[8]];
                [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
                [s.L[2], s.L[5], s.L[8]] = reverse([s.D[2], s.D[1], s.D[0]]);
                [s.D[0], s.D[1], s.D[2]] = [s.R[0], s.R[3], s.R[6]];
                [s.R[0], s.R[3], s.R[6]] = temp;
            }
            rotateFace(s.F, modifier);
            break;
        case 'B':
            if (modifier === "'") {
                const temp = [s.U[0], s.U[1], s.U[2]];
                [s.U[0], s.U[1], s.U[2]] = [s.R[2], s.R[5], s.R[8]];
                [s.R[2], s.R[5], s.R[8]] = reverse([s.D[8], s.D[7], s.D[6]]);
                [s.D[6], s.D[7], s.D[8]] = [s.L[0], s.L[3], s.L[6]];
                [s.L[0], s.L[3], s.L[6]] = reverse(temp);
            } else if (modifier === '2') {
                const temp = [s.U[0], s.U[1], s.U[2]];
                [s.U[0], s.U[1], s.U[2]] = [s.D[6], s.D[7], s.D[8]];
                [s.D[6], s.D[7], s.D[8]] = temp;
                const tempR = [s.R[2], s.R[5], s.R[8]];
                [s.R[2], s.R[5], s.R[8]] = reverse([s.L[6], s.L[3], s.L[0]]);
                [s.L[0], s.L[3], s.L[6]] = reverse(tempR);
            } else {
                const temp = [s.U[0], s.U[1], s.U[2]];
                [s.U[0], s.U[1], s.U[2]] = reverse([s.L[0], s.L[3], s.L[6]]);
                [s.L[0], s.L[3], s.L[6]] = [s.D[8], s.D[7], s.D[6]];
                [s.D[6], s.D[7], s.D[8]] = reverse([s.R[8], s.R[5], s.R[2]]);
                [s.R[2], s.R[5], s.R[8]] = temp;
            }
            rotateFace(s.B, modifier);
            break;
    }
}

function applyScramble(scramble) {
    const s = createSolvedCube();
    if (!scramble) return s;

    const moves = scramble.split(' ');
    moves.forEach(move => {
        const face = move[0];
        const modifier = move.slice(1);
        applyMove(s, face, modifier);
    });
    return s;
}

function validateCube(s) {
    const colors = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];
    const counts = {};
    colors.forEach(c => counts[c] = 0);

    Object.values(s).forEach(face => {
        face.forEach(color => {
            if (counts[color] !== undefined) {
                counts[color]++;
            }
        });
    });

    let valid = true;
    colors.forEach(c => {
        if (counts[c] !== 9) {
            console.log(`Invalid: ${c} has ${counts[c]} stickers (expected 9)`);
            valid = false;
        }
    });
    return valid;
}

// Test with scramble from user
const scramble = "R D' F' B' U L D2 D U2 F2 L U' L' D' R L2 R2 B' F2 F";
const cube = applyScramble(scramble);

console.log('Scramble:', scramble);
console.log('Validation:', validateCube(cube) ? 'PASS' : 'FAIL');

console.log('\nFace counts:');
['U', 'D', 'F', 'B', 'R', 'L'].forEach(face => {
    const counts = {};
    cube[face].forEach(c => counts[c] = (counts[c] || 0) + 1);
    console.log(face + ':', counts);
});
