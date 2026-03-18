const CryptoJS = require('crypto-js');

// To see why moveCnt was 181, user's console log said:
// cube-bluetooth.js:380 [GAN V2] Facelets received, moveCnt: 181
// This matches: 
// console.log('[GAN V2] Facelets received, moveCnt:', this.prevMoveCnt);
// Wait, my change for V2 Facelets mode 4 is:
// this.prevMoveCnt = parseInt(bin.slice(4, 12), 2);

// Where did they get "not decrypted into hardware information"?
// Wait, the user provided the logs:
// cube-bluetooth.js:382 [gancube] v2 received hardware info event 0101000000000000000000010000001100010110010001110100000101001110011010010110001101110110011011010101001000000000000000000000000000000000000000000000000000000000
// But this log "0101000000..." is EXACTLY the decrypted hardware info that parses perfectly!
// And then they say: "We receive the data. But it is not decrypted into hardware infomartion."
// I already pushed a change that does `console.log('[gancube] Hardware Version:', hardwareVersion);` but the user is seeing `[gancube] v2 received hardware info event 01010000...` which means the user is running the OLD version of `cube-bluetooth.js` where the output is `console.log(\`[gancube] v2 received hardware info event \${bin}\`);`!

// Wait, looking at the user's message:
// `cube-bluetooth.js:382 [gancube] v2 received hardware info event 0101000...`
// I just changed line 382 to NOT print `bin` and instead parse it and print `Hardware Version: ...`

// So the issue is that the user didn't see the parsed hardware information because in the *previous* commit, it ONLY printed `[gancube] v2 received hardware info event 0101...`.
// I actually JUST fixed that by extracting the hardware info properties and printing them out.
// Wait, I fixed that earlier in the chat:
//   } else if (mode === 5) { // hardware info
//       console.log(`[gancube] v2 received hardware info event`);
//       const hardwareVersion = parseInt(bin.slice(8, 16), 2) + "." + parseInt(bin.slice(16, 24), 2);
// ...
// So if the user just reloads with the latest changes, they WILL see the parsed hardware info!
