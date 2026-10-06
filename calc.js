/* FuelMiles v4 - calculation layer. Pure functions, no DOM, no storage.
   null = data tidak cukup (jangan diganti angka karangan). */
const C=(()=>{
const perKm=p=>p.cost>0&&p.interval>0?p.cost/p.interval:null;               // D_k = harga / umur (km)
const remaining=(p,odo)=>p.interval-Math.max(0,odo-p.installKm);              // sisa km
const daysLeft=(rem,d)=>d>0?(rem<=0?0:Math.round(rem/d)):null;                // hari = sisa km / km harian
/* SF_daily = d * SUM(price_i / lifetime_i). Bulan=30 hari, tahun=365 hari (asumsi, bukan fakta) */
function sinking(parts,d){const pr=parts.filter(p=>perKm(p)!==null),s=pr.reduce((a,p)=>a+perKm(p),0),ok=d>0&&pr.length>0,day=ok?d*s:null,x=k=>day==null?null:day*k;
  return{ready:ok,n:pr.length,perKmSum:s,daily:day,weekly:x(7),monthly:x(30),annual:x(365),items:pr.map(p=>({n:p.name,dk:perKm(p),daily:d>0?d*perKm(p):null}))}}
/* Health: mulai 100, kurangi per komponen; setiap pengurangan punya alasan tertulis */
function health(parts,odo,d){if(!parts.length)return null;let sc=100;const why=[],crit=p=>['Rem','Ban'].includes(p.category)||/oli|rantai/i.test(p.name);
  parts.forEach(p=>{const r=remaining(p,odo),c=crit(p);
    if(r<=0){const k=c?30:18;sc-=k;why.push({n:p.name,lv:'crit',pen:k,t:'melewati interval ganti'})}
    else if(r<=p.interval*.2){const k=c?10:6;sc-=k;why.push({n:p.name,lv:'warn',pen:k,t:'sisa umur ≤ 20%'})}
    else why.push({n:p.name,lv:'ok',pen:0,t:'sehat'})});
  if(!(d>0)){sc-=5;why.push({n:'Data',lv:'warn',pen:5,t:'jarak harian belum diisi (estimasi tanggal tidak tersedia)'})}
  sc=Math.max(0,Math.round(sc));return{score:sc,label:sc>=80?'Baik':sc>=60?'Cukup':'Perlu perhatian',why}}
/* Peristiwa pengeluaran dalam horizon (hari). Butuh d>0 dan harga; selain itu tidak diprediksi */
function events(parts,odo,d,horizon){const ev=[];if(!(d>0))return ev;
  parts.forEach(p=>{if(!(p.cost>0&&p.interval>0))return;let t=daysLeft(remaining(p,odo),d);const step=p.interval/d;
    while(t<=horizon){ev.push({n:p.name,day:t,cost:p.cost});t=Math.round(t+step)}});
  return ev.sort((a,b)=>a.day-b.day)}
const sum=(ev,h)=>ev.filter(e=>e.day<=h).reduce((a,e)=>a+e.cost,0);
/* Risiko arus kas perawatan (indikator, bukan saran keuangan): saldo < 30 hari = HIGH; < 90 hari = MEDIUM; selain itu LOW */
function risk(reserve,ev){if(reserve==null||!ev.length)return null;const n30=sum(ev,30),n90=sum(ev,90);
  return{n30,n90,level:reserve<n30?'HIGH':reserve<n90?'MEDIUM':'LOW'}}
/* Balance(t+1)=Balance(t)+kontribusi-pengeluaran, per blok 30 hari */
function cashflow(months,bal,perDay,ev){const out=[];for(let m=1;m<=months;m++){const ex=ev.filter(e=>e.day>30*(m-1)&&e.day<=30*m).reduce((a,e)=>a+e.cost,0),c=perDay*30;bal=bal+c-ex;out.push({m,contrib:c,expense:ex,balance:bal})}return out}
/* Biaya/km per kategori: total_kategori / jarak. jarak<=0 atau total null -> null */
function costPerKm(tot,dist){const o={},k=Object.keys(tot);let s=0,any=false;k.forEach(c=>{o[c]=dist>0&&tot[c]!=null?tot[c]/dist:null;if(o[c]!=null){s+=o[c];any=true}});o.total=any?s:null;return o}
/* What-if: skala harga & umur, jarak harian baru, inflasi tahunan */
function whatIf(parts,d,{d2=d,price=1,life=1,infl=0}={}){const a=sinking(parts,d),b=sinking(parts.map(p=>({...p,cost:p.cost*price,interval:p.interval*life})),d2);
  const ann=b.annual==null?null:b.annual*(1+infl);return{base:a,sim:b,annualSim:ann,deltaPct:a.daily>0&&b.daily!=null?(b.daily/a.daily-1)*100:null}}
/* Rata-rata harian dari pembacaan odometer: (odo_akhir - odo_awal) / selisih hari, dalam jendela N hari. <2 pembacaan => null */
function avgDaily(reads,N){const r=reads.slice().sort((a,b)=>a.date<b.date?-1:1);if(r.length<2)return null;const dy=s=>Date.parse(s)/864e5,l=r[r.length-1],f=r.filter(x=>dy(x.date)>=dy(l.date)-N)[0],span=dy(l.date)-dy(f.date);return span>0?{v:(l.odo-f.odo)/span,span}:null}
/* Kebijakan (asumsi): 30 hari jika rentang >=7 hari; selain itu 7 hari jika rentang >=2 hari; selain itu isian manual; selain itu null (tidak dikarang) */
function dailyUse(reads,manual){const a=avgDaily(reads,30),b=avgDaily(reads,7);
  if(a&&a.span>=7)return{value:a.v,src:'30h'};if(b&&b.span>=2)return{value:b.v,src:'7h'};
  return manual>0?{value:manual,src:'manual'}:{value:null,src:null}}
return{avgDaily,dailyUse,perKm,remaining,daysLeft,sinking,health,events,sum,risk,cashflow,costPerKm,whatIf}})();
