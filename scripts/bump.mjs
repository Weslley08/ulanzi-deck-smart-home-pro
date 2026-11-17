// Intentionally fail without a versioning implementation that synchronizes manifest, package, and lockfiles.
import {readFileSync} from 'node:fs';
const requested=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(requested||''))throw new Error('Usage: npm run bump -- X.Y.Z');
throw new Error('Version bump requires atomic updates to manifest and both lockfiles; not implemented. Release blocked.');
