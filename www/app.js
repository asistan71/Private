'use strict';
const demo=['THYAO','ASELS','TUPRS','BIMAS'].map(symbol=>({symbol,price:null,change:null,score:null}));
const $=id=>document.getElementById(id);
let market='BIST',rows=[],source='demo',onlyFavorites=false,requestId=0;
let favorites={};
try{favorites=JSON.parse(localStorage.getItem('pt-favorites-v1')||'{}')||{}}catch(_){favorites={}}
const favoriteKey=s=>market+':'+s;
function saveFavorites(){try{localStorage.setItem('pt-favorites-v1',JSON.stringify(favorites))}catch(_){}}
function render(){
 const q=$('search').value.trim().toUpperCase(),min=Number($('minScore').value)||0;
 const filtered=rows.filter(x=>x.symbol.includes(q)&&(x.score===null||x.score>=min)&&(!$('onlyStrong').checked||(x.score!==null&&x.score>=80))&&(!onlyFavorites||favorites[favoriteKey(x.symbol)]));
 $('results').replaceChildren();
 for(const x of filtered){
  const tr=document.createElement('tr');tr.dataset.symbol=x.symbol;
  const star=document.createElement('td'),btn=document.createElement('button');btn.textContent=favorites[favoriteKey(x.symbol)]?'★':'☆';btn.setAttribute('aria-label',x.symbol+' favori');btn.className='star';btn.addEventListener('click',e=>{e.stopPropagation();const k=favoriteKey(x.symbol);if(favorites[k])delete favorites[k];else favorites[k]=true;saveFavorites();render()});star.append(btn);tr.append(star);
  [x.symbol,x.price==null?'—':Number(x.price).toLocaleString('tr-TR',{maximumFractionDigits:8}),x.change==null?'—':Number(x.change).toFixed(2)+'%',x.score==null?'—':String(x.score),x.score==null?'Skor hesaplanmadı':x.score>=80?'Güçlü izleme':x.score>=70?'İzleme':'Bekle'].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===2&&x.change!=null)td.className=x.change>=0?'up':'down';tr.append(td)});
  tr.addEventListener('click',()=>{if(market==='FUTURES'&&source==='live')analyzeFutures(x.symbol);else $('detail').textContent=x.symbol+' | '+(source==='live'?'24 saatlik fiyat verisi. MTF strateji skoru, stop ve hedefler henüz hesaplanmadı.':'DEMO: Fiyat ve skor gerçek tarama sonucu değildir.')});$('results').append(tr);
 }
 $('status').textContent=filtered.length+' '+(source==='live'?'piyasa kaydı':'örnek aday');
}
function reset(){requestId++;rows=[];source='demo';$('results').replaceChildren();$('detail').textContent='';$('status').textContent='Veri bekleniyor';$('universe').textContent=market==='BIST'?'Evren: 631 (hedef)':'Evren: veri bekleniyor';$('notice').textContent=market==='BIST'?'BIST canlı veri sağlayıcısı bağlı değil; demo yalnızca arayüz testidir.':'24 saatlik fiyat sorgusu. Strateji skoru henüz hesaplanmıyor.';render()}
document.querySelectorAll('[data-market]').forEach(b=>b.addEventListener('click',()=>{market=b.dataset.market;document.querySelectorAll('[data-market]').forEach(x=>x.classList.toggle('active',x===b));reset()}));
$('favorites').addEventListener('click',()=>{onlyFavorites=!onlyFavorites;$('favorites').classList.toggle('active',onlyFavorites);render()});
async function scan(single=false){
 const symbol=$('search').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(single&&!symbol){$('status').textContent='Önce sembol yazın';return}
 const current=++requestId;
 if(market==='BIST'){
  // A licensed BIST feed must be served by a trusted backend. No API keys in the APK.
  const endpoint=window.PT_BIST_API_URL;
  if(!endpoint){source='demo';rows=single?demo.filter(x=>x.symbol===symbol):demo.slice();$('notice').textContent='DEMO: Canlı BIST veri sağlayıcısı yapılandırılmadı. Skorlar örnektir.';render();return}
  $('status').textContent='BIST verisi alınıyor…';
  try{
    const target=new URL(endpoint,location.href);
    if(target.protocol!=='https:' && target.hostname!=='localhost')throw Error('Güvenli HTTPS bağlantısı gerekli');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let response;try{response=await fetch(target.href,{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timer)}
    if(!response.ok)throw Error('HTTP '+response.status);
    const payload=await response.json();if(current!==requestId)return;
    if(!payload||!Array.isArray(payload.symbols)||typeof payload.source!=='string'||!payload.source.trim()||!Number.isFinite(Date.parse(payload.asOf)))throw Error('Geçersiz veri şeması');
    if(Date.parse(payload.asOf)>Date.now()+300000)throw Error('Gelecek tarihli veri');
    const ageMinutes=(Date.now()-Date.parse(payload.asOf))/60000;
    if(ageMinutes>Math.max(30,Number(payload.delayedMinutes||0)+20))throw Error('Veri güncel değil ('+Math.round(ageMinutes)+' dk eski)');
    const delay=Number(payload.delayedMinutes);
    if(!Number.isFinite(delay)||delay<0)throw Error('Gecikme bilgisi eksik');
    const seen=new Set();
    rows=payload.symbols.filter(x=>{
      if(!x||typeof x.symbol!=='string'||!/^([A-Z]{4,6})$/.test(x.symbol)||seen.has(x.symbol)||!Number.isFinite(x.last)||x.last<=0||!Number.isFinite(x.volume)||x.volume<0||x.currency!=='TRY')return false;
      seen.add(x.symbol);return !single||x.symbol===symbol;
    }).map(x=>({symbol:x.symbol,price:x.last,change:Number.isFinite(x.changePercent)?x.changePercent:null,score:null}));
    source='live';$('universe').textContent='Alınan: '+rows.length+' / Hedef: 631';
    $('notice').textContent='Kaynak: '+payload.source+' | Zaman: '+new Date(payload.asOf).toLocaleString('tr-TR')+' | Gecikme: '+delay+' dk. MTF 100 skoru hesaplanmadı.';
    render();if(!rows.length)$('status').textContent='Geçerli sembol bulunamadı';
  }catch(err){if(current!==requestId)return;rows=[];source='demo';render();$('status').textContent='BIST verisi alınamadı';$('notice').textContent='Canlı veri hatası: '+err.message+'. Demo sonuç üretilmedi.'}
  return;
}
 const urls={FUTURES:'https://fapi.binance.com/fapi/v1/ticker/24hr',BINANCE:'https://api.binance.com/api/v3/ticker/24hr',BINANCE_TR:'https://api.binance.tr/api/v3/ticker/24hr'};
 $('status').textContent='Veri alınıyor…';
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  let response;try{response=await fetch(urls[market],{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timeout)}
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();if(current!==requestId)return;
  if(!Array.isArray(data))throw new Error('Beklenmeyen veri biçimi');
  source='live';rows=data.filter(x=>typeof x.symbol==='string'&&(!single||x.symbol===symbol)&&(market!=='FUTURES'||x.symbol.endsWith('USDT'))).slice(0,single?1:1000).map(x=>({symbol:x.symbol,price:Number.isFinite(Number(x.lastPrice))?Number(x.lastPrice):null,change:Number.isFinite(Number(x.priceChangePercent))?Number(x.priceChangePercent):null,score:null}));
  $('universe').textContent='Getirilen kayıt: '+rows.length;
  $('notice').textContent='24 saatlik fiyat/değişim verisi; gerçek MTF 100 sinyali değildir. BIST 631 hisse taraması ve işlem planı henüz bağlı değil.';
  render();if(!rows.length)$('status').textContent='Eşleşen sembol bulunamadı';
 }catch(err){if(current!==requestId)return;rows=[];$('results').replaceChildren();$('status').textContent='Veri alınamadı';$('notice').textContent='Bağlantı, CORS veya servis kısıtlaması: '+err.message+'. Veri uydurulmadı.'}
}

function ema(values,period){if(values.length<period)return null;const k=2/(period+1);let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;for(const v of values.slice(period))e=v*k+e*(1-k);return e}
function rsi(closes,period=14){if(closes.length<=period)return null;let gain=0,loss=0;for(let i=1;i<=period;i++){const d=closes[i]-closes[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}gain/=period;loss/=period;for(let i=period+1;i<closes.length;i++){const d=closes[i]-closes[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period}return loss===0?(gain===0?50:100):100-100/(1+gain/loss)}
async function analyzeFutures(symbol){
 const id=++requestId,detail=$('detail');detail.textContent=symbol+' | 5m / 15m / 1h mumları alınıyor…';
 try{
  const intervals=['5m','15m','1h'];
  const series=await Promise.all(intervals.map(async interval=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{const url='https://fapi.binance.com/fapi/v1/klines?symbol='+encodeURIComponent(symbol)+'&interval='+interval+'&limit=100';const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error(interval+' HTTP '+response.status);const candles=await response.json();if(!Array.isArray(candles))throw Error(interval+' geçersiz mum verisi');const completed=candles.filter(c=>Array.isArray(c)&&Number(c[6])<Date.now());if(completed.length<55)throw Error(interval+' yetersiz kapanmış mum');return{interval,candles:completed}}finally{clearTimeout(timer)}
  }));
  if(id!==requestId)return;
  const output=series.map(({interval,candles})=>{
   const closes=candles.map(c=>Number(c[4])),volumes=candles.map(c=>Number(c[5]));
   const fast=ema(closes,20),slow=ema(closes,50),strength=rsi(closes);
   const base=volumes.slice(-21,-1).reduce((a,b)=>a+b,0)/20;
   const relativeVolume=base>0?volumes.at(-1)/base:null;
   const trend=fast!=null&&slow!=null?(fast>slow?'Yukarı':'Aşağı'):'Belirsiz';
   const previousHigh=Math.max(...candles.slice(-21,-1).map(c=>Number(c[2])));
   const latestClose=closes.at(-1),distance=previousHigh>0?100*(previousHigh-latestClose)/previousHigh:null;
   const nearBreakout=distance!==null&&distance>=0&&distance<=2;
   const breakout=latestClose>previousHigh;
   const volumeSurge=relativeVolume!==null&&relativeVolume>=1.8;
   const earlyWatch=trend==='Yukarı'&&volumeSurge&&nearBreakout&&strength>=50&&strength<=75;
   return{interval,trend,rsi:strength,rv:relativeVolume,nearBreakout,breakout,earlyWatch,distance};
  });
  const aligned=output.filter(x=>x.trend==='Yukarı').length;
  const early=output.filter(x=>x.earlyWatch).map(x=>x.interval);
  const broken=output.filter(x=>x.breakout).map(x=>x.interval);
  detail.replaceChildren();
  const heading=document.createElement('strong');heading.textContent=symbol+' | Ön analiz (5m / 15m / 1h)';detail.append(heading);
  const p=document.createElement('p');p.textContent='EMA20/EMA50 yükseliş uyumu: '+aligned+'/3. Bu gösterge, masaüstü MTF 100 fırsat skoru değildir.';detail.append(p);
  const watch=document.createElement('p');watch.textContent='Erken hacim izleme (deneysel): '+(early.length?early.join(', '):'Koşullar sağlanmadı')+' | Son 20 mum tepe üzeri kapanış: '+(broken.length?broken.join(', '):'Yok');detail.append(watch);
  for(const x of output){const line=document.createElement('p');line.textContent=x.interval+' | EMA trendi: '+x.trend+' | RSI14: '+(x.rsi==null?'—':x.rsi.toFixed(1))+' | Göreceli hacim: '+(x.rv==null?'—':x.rv.toFixed(2)+'x')+' | Tepeye uzaklık: '+(x.distance===null?'—':x.distance.toFixed(2)+'%');detail.append(line)}
  const note=document.createElement('small');note.textContent='Yalnızca kapanmış mumlar kullanılır. Deneysel izleme: EMA20>EMA50, RVOL≥1.8, RSI 50–75 ve son 20 mum tepesine %0–2 mesafe. Bu masaüstü kalkış algoritması değildir. Giriş, stop, TP veya al/sat sinyali üretilmez. Canlı veri erişimi bölgesel olarak kısıtlanabilir.';detail.append(note);
 }catch(err){if(id===requestId)detail.textContent='MTF ön analizi alınamadı: '+err.message}
}

$('scan').addEventListener('click',()=>scan(false));$('single').addEventListener('click',()=>scan(true));
$('search').addEventListener('input',render);$('minScore').addEventListener('input',render);$('onlyStrong').addEventListener('change',render);
