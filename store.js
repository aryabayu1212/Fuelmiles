/* FuelMiles v4 - storage, schema, migrasi. Hanya data sumber; nilai turunan dihitung di calc.js.
   Schema: {v:4, settings, vehicles[], components[], history[], transactions[]}
   components/history/transactions menunjuk vehicleId -> multi-kendaraan tinggal menambah UI. */
const Store=(()=>{
const K={v4:'fuelmiles_v4',v3:'fuelmiles_v3',v2:'fuelmiles_v2'},BK='fuelmiles_v4_corrupt';
const id=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const num=x=>Number.isFinite(+x)?+x:0;
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return undefined}}; // undefined = rusak
const blank=()=>({v:4,settings:{theme:'auto',enabledCats:{fuel:true,maintenance:true,tax:true,insurance:true,other:true,depreciation:false},activeVehicle:null},vehicles:[],components:[],history:[],transactions:[],usage:[]});
/* Hanya field dari user; yang belum diisi = ''/null, tidak ada angka karangan */
const vehicle=(i,startOdo)=>({id:i.id||id('v'),name:i.name||'',brand:i.brand||'',model:i.model||'',generation:i.generation||'',year:i.year||'',plate:i.plate||'',cc:num(i.cc),cvt:i.cvt==null?null:!!i.cvt,photo:i.photo||'',odo:num(i.km??i.odo),dailyKm:num(i.dailyKm),fuelType:i.fuelType||'',notes:i.notes||'',purchasePrice:i.purchasePrice??null,currentValue:i.currentValue??null,startOdo:startOdo===undefined?num(i.km??i.odo):startOdo});
function fromV3(o){const S=blank();(o.bikes||[]).forEach(b=>{const v=vehicle({...b.info,id:b.id},null);S.vehicles.push(v); // startOdo tidak diketahui -> null
  (b.parts||[]).forEach(p=>S.components.push({id:p.id||id('c'),vehicleId:v.id,name:p.name,category:p.category||'',installKm:num(p.installKm),interval:num(p.interval),cost:num(p.cost),note:p.note||''}));
  (b.services||[]).forEach(s=>S.history.push({id:s.id||id('h'),vehicleId:v.id,componentId:null,name:s.name,km:num(s.km),cost:num(s.cost),date:s.date||'',note:s.note||''}))});
  S.settings.activeVehicle=(S.vehicles.find(v=>v.id===o.active)||S.vehicles[0]||{}).id||null;S.migratedFrom=3;return S}
function fromV2(o){if(!o||!o.bike)return null;const b='b'+Date.now().toString(36),S=fromV3({bikes:[{id:b,info:o.bike,parts:o.parts,services:o.services}],active:b});S.migratedFrom=2;return S}
function save(S){try{localStorage.setItem(K.v4,JSON.stringify(S));return true}catch(e){return false}}
function load(){let S=read(K.v4);
  if(S===undefined||(S&&S.v!==4)){try{localStorage.setItem(BK,localStorage.getItem(K.v4))}catch(e){}S=null} // simpan cadangan, jangan ditimpa diam-diam
  if(S){const B=blank(),st=S.settings||{};S={...B,...S,settings:{...B.settings,...st,enabledCats:{...B.settings.enabledCats,...st.enabledCats}}};
    ['vehicles','components','history','transactions','usage'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});return S}
  const o3=read(K.v3),o2=read(K.v2);S=(o3&&o3.bikes?fromV3(o3):fromV2(o2))||blank();save(S);return S} // v3/v2 TIDAK dihapus (cadangan)
const wipe=()=>[...Object.values(K),BK].forEach(k=>localStorage.removeItem(k));
function removeVehicle(S,vid){['components','history','transactions','usage'].forEach(k=>S[k]=S[k].filter(x=>x.vehicleId!==vid));S.vehicles=S.vehicles.filter(v=>v.id!==vid);if(S.settings.activeVehicle===vid)S.settings.activeVehicle=S.vehicles[0]?.id||null}
return{load,save,wipe,vehicle,removeVehicle,id,blank}})();
