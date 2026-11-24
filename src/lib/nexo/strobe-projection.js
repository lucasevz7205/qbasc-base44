// Software projection of solid 3D geometry. No GPU/WebGL context required.
import * as THREE from 'three';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const metal=0xa58a67,blue=0x344e70,gold=0xf2c76e,light=0xc8d9ea;
const meshes=[];
function add(id,geometry,color,position,rotation=0){
 const transform=new THREE.Matrix4().makeRotationZ(rotation);
 transform.setPosition(...position);
 const g=geometry.index?geometry.toNonIndexed():geometry;
 const a=g.getAttribute('position'),triangles=[];
 for(let i=0;i<a.count;i+=3){
  const points=[0,1,2].map(j=>V(a.getX(i+j),a.getY(i+j),a.getZ(i+j)).applyMatrix4(transform));
  triangles.push(points);
 }
 meshes.push({id,color,triangles});
 if(g!==geometry)g.dispose();geometry.dispose();
}
const box=(id,c,x,y,z,w,h,d)=>add(id,new THREE.BoxGeometry(w,h,d),c,[x,y,z]);
const cyl=(id,c,x,y,z,r,h,segments=24)=>add(id,new THREE.CylinderGeometry(r,r,h,segments),c,[x,y,z],Math.PI/2);
box('base',blue,0,-1.2,0,7.2,.22,3.1);
for(const x of [-2.85,2.85])for(const z of [-1.1,1.1])add('base',new THREE.CylinderGeometry(.18,.2,.18,12),metal,[x,-1.4,z]);
cyl('motor',blue,-2.35,0,0,.72,1.15);
box('motor',metal,-2.35,-.86,0,1.1,.56,1);
for(let j=0;j<5;j++)cyl('motor',metal,-2.77+j*.21,0,0,.76,.06);
cyl('shaft',light,-1.43,0,0,.13,.95);
cyl('wheel',metal,-.86,0,0,1.02,.18,40);
cyl('wheel',blue,-.86,0,0,.24,.24);
box('wheel',gold,-.75,.59,0,.035,.57,.105);
cyl('lens',metal,1.05,0,0,.57,.42);
cyl('lens',light,.825,0,0,.44,.025);
box('sensor',gold,1.45,0,0,.08,.76,.76);
box('sensor',blue,1.53,0,0,.12,.96,.96);
// Hollow, schematic camera housing: sensor is not concealed behind an opaque front face.
box('body',blue,2.13,.61,0,1.18,.12,1.38);
box('body',blue,2.13,-.61,0,1.18,.12,1.38);
box('body',blue,2.13,0,.63,1.18,1.12,.12);
box('body',blue,2.13,0,-.63,1.18,1.12,.12);
box('body',blue,2.67,0,0,.10,1.32,1.38);
box('body',metal,2.13,-.86,0,1.08,.35,1.0);
const spread={base:0,motor:-1.2,shaft:-.53,wheel:0,lens:.2,sensor:.82,body:1.65};
const ids=['base','motor','shaft','wheel','lens','sensor','body'];
export const STROBE_VIEWBOX={width:1000,height:540};
export function projectStrobe({angle=0,exploded=1,yaw=35,selected='wheel'}={}){
 if(![angle,exploded,yaw].every(Number.isFinite)||exploded<0||exploded>1||yaw< -60||yaw>75)throw Error('Invalid scene parameters');
 const a=yaw*Math.PI/180,cam=V(Math.sin(a)*11,5.8,Math.cos(a)*11).normalize();
 const right=V(0,1,0).cross(cam).normalize(),up=cam.clone().cross(right).normalize();
 const lamp=V(.5,.9,.7).normalize(),axis=V(1,0,0);
 const raw=[];
 for(const m of meshes){
  for(const triangle of m.triangles){
   const points=triangle.map(v=>{
    const p=v.clone();
    if(m.id==='wheel'||m.id==='shaft')p.applyAxisAngle(axis,-angle);
    p.x+=exploded*spread[m.id];
    if(m.id==='base')p.y-=exploded*.55;
    return p;
   });
   const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
   if(normal.dot(cam)<=1e-6)continue;
   const shade=.55+.45*Math.max(0,normal.dot(lamp));
   const color=new THREE.Color(m.color).multiplyScalar(shade);
   if(m.id===selected)color.lerp(new THREE.Color(gold),.18);
   raw.push({id:m.id,depth:points.reduce((s,p)=>s+p.dot(cam),0)/3,points:points.map(p=>[p.dot(right),-p.dot(up)]),fill:'#'+color.getHexString()});
  }
 }
 const all=raw.flatMap(f=>f.points),minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
 const scale=Math.min(910/(maxX-minX),430/(maxY-minY));
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 const xy=([x,y])=>[500+(x-cx)*scale,270+(y-cy)*scale];
 const faces=raw.sort((a,b)=>a.depth-b.depth).map((f,i)=>({key:i,id:f.id,fill:f.fill,points:f.points.map(xy).map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' ')}));
 // Labels are derived from part geometry; selection remains keyboard accessible via the external controls.
 const visibleIds=ids.filter(id=>faces.some(f=>f.id===id));
 return {faces,visibleIds};
}
