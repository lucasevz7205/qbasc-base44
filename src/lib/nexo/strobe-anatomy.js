// A physical teaching apparatus, NOT a claim about the construction of an audio ADC.
// Single marked wheel, ideal instantaneous photographs; scale dimensions are illustrative.
export const STROBE_NODE='kit-arr-rf-1-reconhecimento-de-fala-e-transcricao-de-2026-11-22-r1.1';
export const STROBE_SOURCE='https://mude.citg.tudelft.nl/book/2024/signal/sampling.html';
export const STROBE_PARTS=Object.freeze([
 {id:'base',title:'Base',detail:'Sustenta o conjunto e mantém o alinhamento da bancada.'},
 {id:'motor',title:'Motor',detail:'Aciona o eixo; a rotação é a frequência do fenômeno observado.'},
 {id:'shaft',title:'Eixo',detail:'Transmite a rotação ao disco, mantendo as peças coaxiais.'},
 {id:'wheel',title:'Disco marcado',detail:'Uma marca única permite distinguir a orientação em cada fotografia.'},
 {id:'lens',title:'Lente',detail:'Representa a formação da imagem do disco; não simula óptica.'},
 {id:'sensor',title:'Sensor',detail:'Representa a captura de imagens discretas à taxa selecionada.'},
 {id:'body',title:'Carcaça',detail:'Sustenta os componentes da câmera, representada de modo esquemático.'}
]);
export function strobeState(frequency,rate,frame=0){
 if(![1,2,3,4,5].includes(frequency)||![4,8,12].includes(rate)||!Number.isInteger(frame)||frame<0||frame>120)throw Error('Invalid strobe parameters');
 const signed=((frequency+rate/2)%rate+rate)%rate-rate/2;
 const condition=frequency===rate/2?'boundary':signed===0?'stationary':signed<0?'reverse':'forward';
 const angle=k=>((frequency*k/rate)%1+1)%1*2*Math.PI;
 return {frequency,rate,frame,signed,condition,angle:angle(frame),frames:Array.from({length:5},(_,i)=>angle(frame+i)),nyquist:rate/2};
}
export function strobeExercise(p){
 const d=strobeState(p.frequency,p.rate);
 return {fields:[{id:'direction',label:'Movimento aparente entre capturas',type:'choice',options:{forward:'No mesmo sentido',reverse:'Sentido inverso',stationary:'Parado',boundary:'Caso limítrofe: sentido ambíguo'},expected:d.condition},{id:'limit',label:'Limite de Nyquist',type:'number',unit:'Hz',digits:0,expected:d.nyquist}],explanation:'A roda real gira '+p.frequency+' volta(s)/s; a câmera captura '+p.rate+' quadros/s. '+(d.condition==='boundary'?'Meia volta por quadro torna o sentido ambíguo.':d.condition==='stationary'?'A marca retorna à mesma posição entre quadros.':d.condition==='reverse'?'O menor deslocamento angular aparente é no sentido inverso.':'O menor deslocamento angular aparente tem o mesmo sentido da rotação.')};
}
export function strobeSource(kit){
 if(kit?.topico!=='rf-1'||kit.materia!=='rf')return null;
 const node=kit.ramos.flatMap(r=>r.f||[]).find(n=>n.id===STROBE_NODE);
 return node?.x?.src&&node.x.e?.includes('metade da taxa')?node:null;
}
