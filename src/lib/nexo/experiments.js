// Deterministic educational simulations, not measurements or student data.
const tau=2*Math.PI;
export const durationMs=1;
export const signal=(frequency,tMs)=>Math.sin(tau*frequency*tMs/1000);
export function sampleSignal(frequency,rate) {
  if(![1000,3000,5000,7000].includes(frequency)||![8000,16000,44100].includes(rate))throw Error('Unsupported parameters');
  const samples=Array.from({length:Math.floor(rate/1000)+1},(_,i)=>({t:i*1000/rate,y:signal(frequency,i*1000/rate)}));
  const alias=Math.abs(((frequency+rate/2)%rate+rate)%rate-rate/2);
  return {samples,nyquist:rate/2,alias,undersampled:frequency>=rate/2};
}
export function quantize(value,bits){
  if(![2,3,4,8,16].includes(bits)||!Number.isFinite(value)||value<-1||value>1)throw Error('Unsupported quantization');
  const levels=2**bits,code=Math.round((value+1)*(levels-1)/2),output=2*code/(levels-1)-1;
  return {levels,code,output,error:Math.abs(output-value)};
}
export function wer({n,s,d,i}){
  if(![n,s,d,i].every(Number.isSafeInteger)||n<1||n>100||s<0||d<0||i<0||s+d>n||i>200)throw Error('Invalid illustrative counts');
  return (s+d+i)/n*100;
}
