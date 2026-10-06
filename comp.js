/* FuelMiles v4 - layar detail komponen & timeline perawatan (KM utama, kalender opsional). Angka dari calc.js. */
let compOpen=null,svcComp=null,tlView='km';
const LBL={ok:'Aman',warn:'Segera',crit:'Lewat jadwal'};
const dFmt=(days,o)=>new Date(Date.now()+days*864e5).toLocaleDateString('id-ID',o||{day:'numeric',month:'short',year:'numeric'});
function openComp(id){compOpen=id;renderComp();openModal('compModal')}
function renderComp(){const c=S.components.find(x=>x.id===compOpen),el=$('compBody');
  if(!c){if(compOpen&&$('compModal').classList.contains('show'))closeModal();compOpen=null;return}
  const b=data.bike,d=effDaily().value||0,s=pState(c),rem=C.remaining(c,b.km),days=d>0?C.daysLeft(rem,d):null,pk=C.perKm(c),res=pk!=null&&d>0?pk*d:null;
  const hist=data.services.filter(h=>h.componentId===c.id).sort((x,y)=>y.km-x.km),armed=typeof armedId!=='undefined';
  el.innerHTML=`<div class="grab"></div>
  <div class="ph"><div><div class="lbl">${esc(c.category)}</div><h2 style="margin:2px 0 0">${esc(c.name)}</h2></div><span class="badge ${s.cls}">${LBL[s.cls]}</span></div>
  <div class="val big" style="margin-top:14px">${rem<=0?'Lewat '+nf(-Math.round(rem)):nf(Math.round(rem))} <small class="u">km</small></div>
  <div class="lbl">${rem<=0?'dari interval ganti':'sisa umur (perkiraan)'}</div>
  <div class="gauge"><u style="width:${s.pct}%;background:${s.col}"></u></div>
  <dl class="kv">
   <dt>Terpasang pada</dt><dd>${nf(c.installKm)} km</dd>
   <dt>Jarak terpakai</dt><dd>${nf(Math.max(0,b.km-c.installKm))} km</dd>
   <dt>Umur yang diharapkan</dt><dd>${nf(c.interval)} km</dd>
   <dt>Harga</dt><dd>${c.cost>0?rp(c.cost):'Belum diisi'}</dd>
   <dt>Cadangan harian</dt><dd>${res!=null?rp(res)+' / hari':c.cost>0?'Butuh km harian':'Butuh harga'}</dd>
   <dt>Estimasi ganti</dt><dd>${days==null?'Butuh km harian':rem<=0?'Sekarang':'~'+days+' hari · '+dFmt(days)}</dd>
  </dl>
  <div class="note">Estimasi dari km harian dan umur yang kamu isi. Ini perkiraan, bukan jaminan.</div>
  <div class="sec"><h2>Riwayat penggantian</h2></div>
  ${hist.length?hist.map(h=>`<div class="card"><div class="svc"><div><b>${esc(h.name)}</b><div class="hist">${dt(h.date)} · ${nf(h.km)} km${h.note?' · '+esc(h.note):''}</div></div><div class="p">${rp(h.cost)}</div></div></div>`).join(''):'<div class="empty">Belum ada riwayat penggantian. Catat penggantian pertama saat komponen diganti.</div>'}
  <button class="btn" style="margin-top:6px" onclick="openReplace('${c.id}')">Catat penggantian</button>
  <div class="acts" style="justify-content:center;margin-top:10px"><button class="del" onclick="del(this,'parts','${c.id}')">Hapus komponen</button></div>`}
function openReplace(id){const c=S.components.find(x=>x.id===id),b=data.bike;if(!c||!b)return;
  openModal('serviceModal');svcComp=id;$('svcTitle').textContent='Catat penggantian';svcName.value='Ganti '+c.name;svcKm.value=b.km;svcCost.value=c.cost>0?c.cost:'';svcDate.value=today()}
function setTL(v){tlView=v;$('tlK').classList.toggle('acc',v==='km');$('tlC').classList.toggle('acc',v==='cal');renderTimeline()}
function renderTimeline(){const b=data.bike,d=effDaily().value||0,el=$('tl');
  const a=b?data.parts.filter(p=>p.interval>0).map(p=>({p,r:C.remaining(p,b.km),s:pState(p)})).sort((x,y)=>x.r-y.r):[];
  if(!a.length){el.innerHTML='<div class="empty">Belum ada komponen. Tambahkan komponen pertama untuk melihat kapan perawatan berikutnya.</div>';return}
  const dy=r=>d>0&&r>0?C.daysLeft(r,d):null;
  const item=x=>`<div class="it s-${x.s.cls}" onclick="openComp('${x.p.id}')"><div class="km">${x.r<=0?'Lewat '+nf(-Math.round(x.r)):nf(Math.round(x.r))} km</div><div class="nm">${esc(x.p.name)}</div><small>${LBL[x.s.cls]}${dy(x.r)!=null?' · ~'+dy(x.r)+' hari':''}</small></div>`;
  if(tlView==='cal'){
    if(!(d>0)){el.innerHTML='<div class="empty">Tampilan kalender butuh kilometer harian. Tambahkan kilometer harian di Beranda untuk mengaktifkannya.</div>';return}
    const g={};a.forEach(x=>{const k=x.r<=0?'Terlambat':dFmt(dy(x.r),{month:'long',year:'numeric'});(g[k]=g[k]||[]).push(x)});
    el.innerHTML=Object.keys(g).map(k=>`<div class="lbl" style="margin:14px 0 8px">${k}</div><div class="tl">${g[k].map(item).join('')}</div>`).join('');return}
  const late=a.filter(x=>x.r<=0),up=a.filter(x=>x.r>0);
  el.innerHTML=`<div class="tl">${late.map(item).join('')}<div class="it now"><div class="km">SEKARANG</div><small>${nf(b.km)} km</small></div>${up.map(item).join('')}</div>`+(d>0?'':'<div class="note">Tambahkan kilometer harian untuk mengaktifkan estimasi tanggal.</div>')}
