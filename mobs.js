import * as THREE from 'three';

// Static, simplified vanilla-shaped animals. Positions, skins and rotations come
// from the server snapshot; this does not simulate Minecraft entity AI.
const loader = new THREE.TextureLoader();
const skins = new Map();
function skin(file) {
  if (skins.has(file)) return skins.get(file);
  const texture = loader.load(`./mob-${file}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const material = new THREE.MeshLambertMaterial({ map:texture, alphaTest:.25 });
  skins.set(file, material);
  return material;
}
const plain = new Map();
function color(c) {
  if (!plain.has(c)) plain.set(c,new THREE.MeshLambertMaterial({color:c}));
  return plain.get(c);
}
function box(parent, dimensions, center, material) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...dimensions),material);
  mesh.position.set(...center); parent.add(mesh); return mesh;
}
// Vanilla cuboid texture unwrap, in texture pixel coordinates (64x64 sheets).
function skinBox(parent, pixels, center, material, u, v) {
  const [w,h,d]=pixels;
  const mesh=box(parent,pixels.map(n=>n/16),center,material);
  const regions=[
    [u+d+w,v+d,u+d+w+d,v+d+h], [u,v+d,u+d,v+d+h],
    [u+d,v,u+d+w,v+d], [u+d+w,v,u+d+w+w,v+d],
    [u+d+w+d,v+d,u+d+w+d+w,v+d+h], [u+d,v+d,u+d+w,v+d+h],
  ];
  const uv=mesh.geometry.attributes.uv;
  regions.forEach(([x0,y0,x1,y1],face)=>{
    [[x0,y0],[x1,y0],[x0,y1],[x1,y1]].forEach(([x,y],i)=>uv.setXY(face*4+i,x/64,1-y/64));
  });
  uv.needsUpdate=true;
  return mesh;
}
function panda(e) {
  const group=new THREE.Group();
  let gene=e.mainGene;
  if (['brown','weak'].includes(gene)&&e.hiddenGene!==gene)gene='normal';
  const material=skin(gene==='normal'?'panda.png':`${gene}_panda.png`);
  const dark=color(gene==='brown'?0x694535:0x202020);
  const body=skinBox(group,[19,26,13],[0,.85,.05],material,0,19);
  body.rotation.x=Math.PI/2;
  for (const x of [-.4,.4])for(const z of [-.55,.6])
    skinBox(group,[6,9,6],[x,.28,z],material,40,0);
  skinBox(group,[13,10,9],[0,1.03,-.85],material,0,0);
  box(group,[.25,.28,.16],[-.36,1.4,-.84],dark);
  box(group,[.25,.28,.16],[.36,1.4,-.84],dark);
  box(group,[.22,.13,.08],[0,.97,-1.16],dark);
  if(e.age<0)group.scale.setScalar(.5);
  return group;
}
function horse(e) {
  const group=new THREE.Group(),material=skin(`horse_variant_${e.variant}.png`);
  const mane=color(0x38291f);
  skinBox(group,[10,10,22],[0,1.12,.1],material,0,32);
  for(const x of [-.23,.23])for(const z of [-.48,.65]){
    skinBox(group,[4,12,4],[x,.4,z],material,48,21);
    box(group,[.26,.14,.26],[x,.07,z],color(0x38312e));
  }
  const neck=skinBox(group,[4,12,6],[0,1.52,-.58],material,0,0);
  neck.rotation.x=-.42;
  skinBox(group,[6,5,7],[0,1.88,-.86],material,0,13);
  skinBox(group,[4,3,6],[0,1.69,-1.12],material,0,25);
  for(const x of [-.14,.14])skinBox(group,[2,4,1],[x,2.15,-.67],material,19,16);
  const tail=box(group,[.15,.65,.13],[0,.95,.91],mane); tail.rotation.x=-.45;
  const crest=box(group,[.09,.75,.13],[0,1.61,-.33],mane);crest.rotation.x=-.42;
  for(const x of [-.192,.192])box(group,[.025,.07,.07],[x,1.91,-.95],color(0x121212));
  if(e.equipment?.saddle)box(group,[.7,.08,.7],[0,1.46,.05],color(0x6d3524));
  if(e.age<0)group.scale.setScalar(.5);
  return group;
}
function boat(vehicle) {
  const group=new THREE.Group(),wood=color(vehicle.type.includes('jungle')?0x9c7048:0xa78650);
  box(group,[1.35,.14,1.85],[0,0,0],wood);
  box(group,[.12,.4,1.85],[-.65,.2,0],wood);
  box(group,[.12,.4,1.85],[.65,.2,0],wood);
  box(group,[1.3,.4,.12],[0,.2,-.9],wood);
  box(group,[1.3,.4,.12],[0,.2,.9],wood);
  group.position.set(...vehicle.position);
  group.rotation.y=-(vehicle.rotation?.[0]||0)*Math.PI/180;
  return group;
}
function label(value) {
  if(!value)return null;
  let text=typeof value==='object'?value.text: String(value);
  if(typeof value==='string'){try{text=JSON.parse(value).text||value;}catch{}}
  if(!text)return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#12251cbb';ctx.fillRect(0,0,512,80);
  ctx.font='32px system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(text.slice(0,30),256,52);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true}));
  sprite.scale.set(2,.3125,1);return sprite;
}
export async function addSnapshotMobs(scene) {
  const response=await fetch('./mobs.json');
  if(!response.ok)throw new Error('Не удалось загрузить животных');
  const data=await response.json(),colliders=[];
  const boats=new Set();
  for(const e of data.entities){
    const group=e.type==='horse'?horse(e):panda(e);
    group.position.set(...e.position);
    // Minecraft yaw zero points south; model faces local -Z.
    group.rotation.y=Math.PI-(e.rotation?.[0]||0)*Math.PI/180;
    group.userData={entityType:e.type,uuid:e.uuid,snapshot:data.snapshotUtc};
    const tag=label(e.name);if(tag){tag.position.y=e.type==='horse'?2.5:1.75;group.add(tag);}
    scene.add(group);
    // A static solid body prevents walking through the center of an animal.
    const factor=e.age<0?.5:1,r=(e.type==='horse'?.55:.65)*factor,h=(e.type==='horse'?1.55:1.15)*factor;
    const[x,y,z]=e.position;colliders.push([x-r,y,z-r,x+r,y+h,z+r]);
    if(e.vehicle?.type?.includes('boat')){
      const id=JSON.stringify(e.vehicle.position);
      if(!boats.has(id)){boats.add(id);scene.add(boat(e.vehicle));}
    }
  }
  return {count:data.entities.length,colliders,snapshotUtc:data.snapshotUtc};
}
