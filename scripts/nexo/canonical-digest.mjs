// Digest of a repository file independent of the checkout's line-ending policy.
// Text files (no NUL byte in the first 8000 bytes) are hashed after CRLF -> LF,
// matching the LF blobs recorded in docs/nexo/source-inventory.json and the
// representation pilot. Binary files are hashed byte for byte.
import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';

export function canonicalBytes(bytes){
  const buffer=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
  if(buffer.subarray(0,8000).includes(0))return buffer;
  return Buffer.from(buffer.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
}

export function canonicalDigest(bytes){
  return 'sha256:'+createHash('sha256').update(canonicalBytes(bytes)).digest('hex');
}
