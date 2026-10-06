/* FuelMiles v4 - renderer Beranda & daftar transaksi. Semua angka dari calc.js; null => "Belum ada data". */
const CATL={fuel:'BBM',maintenance:'Perawatan',tax:'Pajak',insurance:'Asuransi',other:'Lainnya',depreciation:'Depresiasi'};
const TXL={fuel:'BBM',tax:'Pajak',insurance:'Asuransi',other:'Lainnya',reserve_in:'Setor dana cadangan',reserve_out:'Tarik dana cadangan'};
const NONE='Belum ada data';
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)}; // tanggal lokal, bukan UTC
let useWarned=false;
function effDaily(){const b=data.bike;return b?C.dailyUse(data.usage,b.dailyKm):{value:null,src:null}}
/* validasi catatan odometer: tidak boleh lebih kecil dari catatan sebelumnya / lebih besar dari berikutnya */
function useCheck(){const v=curV(),m=useMode.value,val=Number(useVal.value),d=useDate.value;
  if(useVal.value===''||!(val>=0))return{err:'Isi angka dalam km (tidak boleh negatif).'};
  if(!d||d>today())return{err:'Tanggal tidak boleh kosong atau di masa depan.'};
  const u=data.usage.filter(x=>x.date!==d).sort((a,b)=>a.date<b.date?-1:1),prev=[...u].reverse().find(x=>x.date<d),next=u.find(x=>x.date>d),base=Math.max(prev?prev.odo:0,next?0:v.odo);
  if(m==='dist'&&next)return{err:'Mode jarak hanya untuk catatan terbaru. Pakai odometer untuk tanggal lampau.'};
  const odo=m==='odo'?val:base+val;
  if(odo<base)return{err:'Odometer tidak boleh lebih kecil dari '+nf(base)+' km (catatan sebelumnya).'};
  if(next&&odo>next.odo)return{err:'Odometer tidak boleh lebih besar dari catatan berikutnya ('+nf(next.odo)+' km).'};
  const days=prev?Math.max(1,(Date.parse(d)-Date.parse(prev.date))/864e5):1;
  return{odo,prev,perDay:prev?(odo-prev.odo)/days:null}} // tanpa catatan sebelumnya, laju harian tidak bisa dinilai
function useHint(){const o=useMode.value==='odo';useLbl.textContent=o?'Odometer hari ini (km)':'Jarak tempuh hari ini (km)';useVal.value=o&&curV()?curV().odo:'';useErr.textContent=''}
function openUse(){if(!curV()){toast('Tambahkan motor dulu');return}openModal('useModal');useDate.value=today();useMode.value='odo';useWarned=false;useBtn.textContent='Simpan';useHint()}
function saveUse(e){e.preventDefault();const v=curV();if(!v)return;const c=useCheck();useErr.textContent=c.err||'';if(c.err)return;
  if(c.perDay>500&&!useWarned){useWarned=true;useErr.textContent='Rata-rata '+nf(Math.round(c.perDay))+' km/hari tidak biasa. Cek angkanya, atau tekan lagi untuk tetap menyimpan.';useBtn.textContent='Tetap simpan';return}
  S.usage=S.usage.filter(x=>!(x.vehicleId===v.id&&x.date===useDate.value));
  S.usage.push({id:Store.id('u'),vehicleId:v.id,date:useDate.value,odo:c.odo,distance:c.prev?c.odo-c.prev.odo:null,note:''});
  if(c.odo>v.odo)v.odo=c.odo;save();e.target.reset();closeModal();toast('Kilometer tercatat')}
function metrics(){const b=data.bike;if(!b)return null;
  const parts=data.parts,hist=data.services,tx=data.tx,on=S.settings.enabledCats,odo=b.km,d=effDaily().value||0,st=b.startOdo;
  const dist=st!=null&&odo>st?odo-st:null,sum=t=>{const a=tx.filter(x=>x.type===t);return a.length?a.reduce((s,x)=>s+x.amount,0):null};
  const mh=hist.filter(h=>st!=null&&h.km>=st),tot={fuel:sum('fuel'),maintenance:mh.length?mh.reduce((s,h)=>s+h.cost,0):null,tax:sum('tax'),insurance:sum('insurance'),other:sum('other'),
    depreciation:b.purchasePrice!=null&&b.currentValue!=null?Math.max(0,b.purchasePrice-b.currentValue):null};
  Object.keys(tot).forEach(k=>{if(!on[k])delete tot[k]});
  const rs=tx.filter(x=>x.type.startsWith('reserve')),res=rs.length?rs.reduce((s,x)=>s+(x.type==='reserve_in'?x.amount:-x.amount),0):null;
  const ev=C.events(parts,odo,d,365),pc=parts.some(p=>p.cost>0&&p.interval>0);
  return{b,odo,d,dist,tot,cpk:C.costPerKm(tot,dist),res,ev,health:C.health(parts,odo,d),risk:C.risk(res,ev),proj:d>0&&pc?C.sum(ev,30):null,
    next:parts.filter(p=>p.interval>0).map(p=>({p,r:C.remaining(p,odo)})).sort((a,b)=>a.r-b.r)[0]}}
function renderHome(){const m=metrics();$('dash').hidden=!m;renderTx();if(!m)return;
  const miss=Object.keys(m.tot).filter(k=>m.cpk[k]==null).map(k=>CATL[k]);
  $('hCpk').textContent=m.cpk.total!=null?rp(m.cpk.total)+' / km':NONE;
  $('hCpkN').textContent=m.dist==null?(m.b.startOdo==null?'Isi odometer awal di Edit motor agar jarak tercatat bisa dihitung.':'Jarak tercatat masih 0 km. Perbarui odometer lewat ＋ pengeluaran atau Edit motor.'):m.cpk.total==null?'Catat BBM, servis, atau pengeluaran lain untuk mulai.':'Jarak tercatat '+nf(m.dist)+' km.'+(miss.length?' Belum termasuk: '+miss.join(', ')+' (belum ada data).':'');
  const du=effDaily(),SRC={'30h':'Rata-rata 30 hari dari catatan odometer','7h':'Rata-rata 7 hari dari catatan odometer',manual:'Isian manual di profil motor. Catat odometer harian agar otomatis'};
  $('hDaily').textContent=du.value!=null?nf(Math.round(du.value*10)/10)+' km/hari':NONE;
  $('hDailyN').textContent=du.src?SRC[du.src]+'. Tap untuk menambah.':'Tambahkan kilometer harian untuk mengaktifkan forecasting.';
  const h=m.health,w=h&&h.why.find(x=>x.lv!=='ok');
  $('hHealth').textContent=h?h.score+' / 100':NONE;
  $('hHealthN').innerHTML=h?`<span class="badge ${h.score>=80?'ok':h.score>=60?'warn':'crit'}">${h.label}</span> ${esc(w?w.n+': '+w.t:'Semua komponen sehat')}`:'Tambah komponen untuk menilai kesehatan perawatan.';
  $('hRes').textContent=m.res!=null?rp(m.res):NONE;
  $('hResN').innerHTML=m.risk?`<span class="badge ${{LOW:'ok',MEDIUM:'warn',HIGH:'crit'}[m.risk.level]}">Risiko ${m.risk.level}</span> Butuh ~${rp(m.risk.n30)} (30 hr), ~${rp(m.risk.n90)} (90 hr)`:m.res!=null?'Risiko belum bisa dinilai: isi jarak harian dan harga komponen.':'Catat setoran dana cadangan untuk memantau saldo.';
  const n=m.next;$('hNext').textContent=n?n.p.name:NONE;
  const dl=n&&m.d>0?C.daysLeft(n.r,m.d):null;
  $('hNextN').textContent=n?(n.r<=0?'Lewat '+nf(-n.r)+' km dari interval':'Perkiraan '+nf(Math.round(n.r))+' km lagi')+(dl!=null&&n.r>0?' · sekitar '+dl+' hari':n.r>0?' · isi jarak harian untuk estimasi tanggal':''):'Tambah komponen di tab Perawatan.';
  $('hProj').textContent=m.proj!=null?rp(m.proj):NONE;
  const e30=m.ev.filter(e=>e.day<=30).map(e=>e.n);
  $('hProjN').textContent=m.proj==null?'Butuh jarak harian dan harga komponen.':e30.length?'Perkiraan, bukan jaminan: '+[...new Set(e30)].slice(0,3).join(', '):'Tidak ada penggantian terjadwal dalam 30 hari.'}
function renderTx(){const a=data.tx.slice().sort((x,y)=>(y.date||'').localeCompare(x.date||'')).slice(0,12);
  $('txList').innerHTML=a.length?a.map(t=>`<div class="card"><div class="svc"><div><b>${TXL[t.type]||esc(t.type)}</b><div class="hist">${dt(t.date)}${t.note?' · '+esc(t.note):''}</div></div><div class="p">${t.type==='reserve_out'?'−':t.type==='reserve_in'?'+':''}${rp(t.amount)}</div></div><div class="acts"><button class="del" onclick="del(this,'tx','${t.id}')">Hapus</button></div></div>`).join(''):'<div class="empty">Belum ada pengeluaran atau setoran dana cadangan.</div>'}
function openTx(){if(!curV()){toast('Tambahkan motor dulu');return}openModal('txModal');$('txDate').value=today();$('txOdo').value=data.bike.km}
function saveTx(e){e.preventDefault();const v=curV();if(!v)return;
  S.transactions.push({id:Store.id('t'),vehicleId:v.id,type:txType.value,amount:Number(txAmt.value),date:txDate.value,note:txNote.value.trim()});
  const o=txOdo.value===''?null:Number(txOdo.value);let msg='Tercatat';
  if(o!=null&&o>v.odo)v.odo=o;else if(o!=null&&o<v.odo)msg='Tercatat. Odometer tidak diubah (lebih kecil dari catatan)';
  save();e.target.reset();closeModal();toast(msg)}
