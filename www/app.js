'use strict';
const demo=[];
let pythonApiUrl='';
try{pythonApiUrl=localStorage.getItem('pt-python-api-url')||''}catch(_){}
let pythonApiToken='';

const $=id=>document.getElementById(id);
let market='BIST',rows=[],source='demo',onlyFavorites=false,requestId=0,detailRequestId=0;
let favorites={};
try{favorites=JSON.parse(localStorage.getItem('pt-favorites-v1')||'{}')||{}}catch(_){favorites={}}
const favoriteKey=s=>market+':'+s;
$('pythonApiUrl').value=pythonApiUrl;
$('savePythonApi').addEventListener('click',()=>{const url=$('pythonApiUrl').value.trim().replace(/\/+$/,'');try{const u=new URL(url);if(u.protocol!=='https:')throw Error('HTTPS gerekli');pythonApiUrl=u.origin+u.pathname.replace(/\/+$/,'');pythonApiToken=$('pythonApiToken').value;localStorage.setItem('pt-python-api-url',pythonApiUrl);$('notice').textContent='Python API adresi kaydedildi. BIST Tara ile bağlantıyı sınayabilirsiniz.'}catch(e){$('notice').textContent='Geçersiz bağlantı: '+e.message}});

function saveFavorites(){try{localStorage.setItem('pt-favorites-v1',JSON.stringify(favorites))}catch(_){}}
function render(){
 const q=$('search').value.trim().toUpperCase(),min=Number($('minScore').value)||0;
 const filtered=rows.filter(x=>x.symbol.includes(q)&&(min===0||(x.score!==null&&x.score>=min))&&(!$('onlyStrong').checked||(x.score!==null&&x.score>=80))&&(!onlyFavorites||favorites[favoriteKey(x.symbol)])).sort((a,b)=>(b.score??-1)-(a.score??-1)||(b.quoteVolume??0)-(a.quoteVolume??0));
 $('results').replaceChildren();
 for(const x of filtered){
  const tr=document.createElement('tr');tr.dataset.symbol=x.symbol;
  const star=document.createElement('td'),btn=document.createElement('button');btn.textContent=favorites[favoriteKey(x.symbol)]?'★':'☆';btn.setAttribute('aria-label',x.symbol+' favori');btn.className='star';btn.addEventListener('click',e=>{e.stopPropagation();const k=favoriteKey(x.symbol);if(favorites[k])delete favorites[k];else favorites[k]=true;saveFavorites();render()});star.append(btn);tr.append(star);
  [x.symbol,x.price==null?'—':Number(x.price).toLocaleString('tr-TR',{maximumFractionDigits:8}),x.change==null?'—':Number(x.change).toFixed(2)+'%',x.score==null?'—':String(x.score)+(x.scoreType==='experimental'?'*':''),x.score==null?'Skor hesaplanmadı':x.scoreType==='experimental'?(x.score>=80?'Ön analiz güçlü':x.score>=70?'Ön analiz izleme':'Ön analiz düşük'):(x.score>=80?'Güçlü izleme':x.score>=70?'İzleme':'Bekle')].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===2&&x.change!=null)td.className=x.change>=0?'up':'down';tr.append(td)});
  tr.addEventListener('click',()=>{if((market==='FUTURES'||market==='BINANCE'||market==='BINANCE_TR')&&x.scoreType==='experimental'&&x.scoreParts){$('detail').textContent=x.symbol+' | Deneysel MTF ön puanı: '+x.score+'/100\n'+x.scoreParts.map(p=>p.tf+' | '+p.score+'/33 | EMA: '+p.trend+' | RSI: '+p.rsi.toFixed(1)+' | RVOL: '+p.rvol.toFixed(2)+'x | Tepe yakınlığı: '+(p.near?'Evet':'Hayır')).join('\n')+'\nYalnızca kapanmış mumlar. Orijinal Python MTF 100 skoru değildir.'}else if(market==='FUTURES'&&source==='live')analyzeFutures(x.symbol);else if(market==='BIST'&&source==='python'&&x.plan){const p=x.plan;$('detail').textContent=[p.Sembol+' | '+p.Sinyal+' | Puan: '+p.Puan,'Giriş: '+(p.Giris??'—')+' | Stop: '+(p.Stop??'—')+' | TP1: '+(p.TP1??'—')+' | TP2: '+(p.TP2??'—')+' | TP3: '+(p.TP3??'—'),'RSI: '+(p.RSI??'—')+' | RVOL: '+(p.HacimOran??'—'),'Veri zaman damgası doğrulanmadı.'].join('\n')}else $('detail').textContent=x.symbol+' | '+(source==='live'?'24 saatlik fiyat verisi. MTF strateji skoru, stop ve hedefler henüz hesaplanmadı.':'DEMO: Fiyat ve skor gerçek tarama sonucu değildir.')});$('results').append(tr);
 }
 $('status').textContent=filtered.length+' sonuç | '+rows.filter(x=>x.score!==null).length+' puanlı';
}
function reset(){requestId++;detailRequestId++;$('pythonBridgeSettings').hidden=market!=='BIST';rows=[];source='demo';$('results').replaceChildren();$('detail').textContent='';$('status').textContent='Veri bekleniyor';$('universe').textContent=market==='BIST'?'Evren: 631 (hedef)':'Evren: veri bekleniyor';$('notice').textContent=market==='BIST'?'BIST canlı veri sağlayıcısı bağlı değil; demo yalnızca arayüz testidir.':'24 saatlik fiyat sorgusu. Strateji skoru henüz hesaplanmıyor.';render()}
document.querySelectorAll('[data-market]').forEach(b=>b.addEventListener('click',()=>{market=b.dataset.market;document.querySelectorAll('[data-market]').forEach(x=>x.classList.toggle('active',x===b));reset()}));
$('favorites').addEventListener('click',()=>{onlyFavorites=!onlyFavorites;$('favorites').classList.toggle('active',onlyFavorites);render()});
async function scan(single=false){
 const symbol=$('search').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(single&&!symbol){$('status').textContent='Önce sembol yazın';return}
 const current=++requestId;detailRequestId++;
 if(market==='BIST'){
  if(!pythonApiUrl){rows=[];source='demo';$('notice').textContent='Python motoruna bağlanmak için HTTPS API adresini girin. BIST fiyatı ve puanı uydurulmaz.';render();$('status').textContent='Python API bağlantısı gerekli';return}
  $('status').textContent='Python motoru BIST taraması çalışıyor…';
  try{
    const target=new URL(pythonApiUrl+'/api/bist/scan');
    if(target.protocol!=='https:')throw Error('HTTPS gerekli');
    if(single)target.searchParams.set('symbol',symbol);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),180000);
    let response;try{response=await fetch(target.href,{signal:controller.signal,cache:'no-store',headers:pythonApiToken?{'Authorization':'Bearer '+pythonApiToken}:{}})}finally{clearTimeout(timer)}
    if(!response.ok)throw Error('API HTTP '+response.status);
    const payload=await response.json();if(current!==requestId)return;
    if(!payload||!Array.isArray(payload.results)||!Number.isInteger(payload.requested))throw Error('Python API şeması geçersiz');
    rows=payload.results.filter(x=>x&&typeof x.Sembol==='string'&&/^[A-Z0-9]{4,6}$/.test(x.Sembol)&&Number.isFinite(Number(x.Fiyat))&&Number(x.Fiyat)>0&&Number.isFinite(Number(x.Puan))&&Number(x.Puan)>=0&&Number(x.Puan)<=100).map(x=>({symbol:x.Sembol,price:Number(x.Fiyat),change:Number.isFinite(Number(x.Degisim))?Number(x.Degisim):null,score:Number(x.Puan),plan:x}));
    source='python';$('universe').textContent='Taranan: '+payload.requested+' | Geçen: '+rows.length;
    $('notice').textContent='Python v23.4 | Filtrelenen: '+(payload.filtered||0)+' | Hata: '+(payload.errors||0)+' | Veri zamanı doğrulanmadı; sonuçlar canlı fiyat olarak sunulmaz.';
    render();$('status').textContent=rows.length+' Python analiz sonucu';
  }catch(err){if(current!==requestId)return;rows=[];source='demo';render();$('status').textContent='Python API hatası';$('notice').textContent=err.message+' | API sunucusu HTTPS ve erişim izniyle çalışmalıdır.'}
  return;
}
 if(market==='BINANCE_TR'){
  $('status').textContent='Binance TR pariteleri alınıyor…';
  try{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   let response;try{response=await fetch('https://www.binance.tr/open/v1/common/symbols',{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timer)}
   if(!response.ok)throw Error('HTTP '+response.status);
   const payload=await response.json();if(current!==requestId)return;
   if(payload.code!==0||!payload.data||!Array.isArray(payload.data.list))throw Error('Beklenmeyen Binance TR yanıtı');
   const seen=new Set();
   rows=payload.data.list.filter(x=>x&&typeof x.symbol==='string'&&x.spotTradingEnable!==0).map(x=>({symbol:x.symbol.replace(/_/g,''),price:null,change:null,score:null,trType:Number(x.type),apiSymbol:x.symbol})).filter(x=>{if(!/^[A-Z0-9]+$/.test(x.symbol)||seen.has(x.symbol))return false;seen.add(x.symbol);return !single||x.symbol===symbol});
   source='symbols';$('universe').textContent='Binance TR pariteleri: '+rows.length;
   const targets=single?rows.slice(0,1):rows.filter(x=>[1,3].includes(x.trType)&&/(TRY|USDT)$/.test(x.symbol)).slice(0,12);
   $('status').textContent='Binance TR mum analizi başlıyor: '+targets.length+' parite';
   let cursor=0,done=0,errors=0;
   async function trWorker(){
    while(cursor<targets.length&&current===requestId){
     const x=targets[cursor++];
     await scoreTrSingle(current,x);
     if(current!==requestId)return;
     done++;if(x.score===null)errors++;
     render();$('status').textContent='Binance TR MTF: '+done+'/'+targets.length+' | Puanlı: '+(done-errors)+' | Hata: '+errors;
    }
   }
   await Promise.all(Array.from({length:3},()=>trWorker()));
   if(current!==requestId)return;
   $('notice').textContent='Binance TR: '+targets.length+' paritede deneysel 5m/15m/1h ön tarama denendi; '+(done-errors)+' puanlandı, '+errors+' veri hatası.'+(errors?' Örnek hata: '+(targets.find(x=>x.scoreError)?.scoreError||'API erişimi')+'.':'')+' Diğer pariteler puansızdır. Orijinal MTF 100 değildir.';
   render();$('status').textContent=rows.length+' Binance TR paritesi | '+rows.filter(x=>x.score!==null).length+' puanlı | '+errors+' hata';
  }catch(err){if(current!==requestId)return;rows=[];source='demo';render();$('status').textContent='Binance TR verisi alınamadı';$('notice').textContent='Binance TR resmî API bağlantısı başarısız: '+err.message+'. Android WebView/CORS kısıtlaması olabilir.'}
  return;
 }
 const urls={FUTURES:'https://fapi.binance.com/fapi/v1/ticker/24hr',BINANCE:'https://api.binance.com/api/v3/ticker/24hr'};
 $('status').textContent='Veri alınıyor…';
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  let response;try{response=await fetch(urls[market],{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timeout)}
  if(!response.ok)throw new Error('HTTP '+response.status);
  const data=await response.json();if(current!==requestId)return;
  if(!Array.isArray(data))throw new Error('Beklenmeyen veri biçimi');
  source='live';rows=data.filter(x=>typeof x.symbol==='string'&&(!single||x.symbol===symbol)&&((market!=='FUTURES'&&market!=='BINANCE')||x.symbol.endsWith('USDT'))).slice(0,single?1:1000).map(x=>({symbol:x.symbol,price:Number.isFinite(Number(x.lastPrice))?Number(x.lastPrice):null,change:Number.isFinite(Number(x.priceChangePercent))?Number(x.priceChangePercent):null,score:null,quoteVolume:Number(x.quoteVolume)||0}));
  $('universe').textContent='Getirilen kayıt: '+rows.length;
  $('notice').textContent='24 saatlik fiyat/değişim verisi; gerçek MTF 100 sinyali değildir. BIST 631 hisse taraması ve işlem planı henüz bağlı değil.';
  render();if(!rows.length)$('status').textContent='Eşleşen sembol bulunamadı';else if(market==='FUTURES'||market==='BINANCE')await scoreBinanceCandidates(current,single,market);
 }catch(err){if(current!==requestId)return;rows=[];$('results').replaceChildren();$('status').textContent='Veri alınamadı';$('notice').textContent='Bağlantı, CORS veya servis kısıtlaması: '+err.message+'. Veri uydurulmadı.'}
}

async function scoreTrSingle(scanId,x){
 if(![1,3].includes(x.trType))return;
 try{
  const base=x.trType===1?'https://api.binance.me/api/v1/klines':'https://cloudme-tr.2meta.app/api/v1/klines';
  const series=await Promise.all(['5m','15m','1h'].map(async tf=>{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
   try{
    const u=base+'?symbol='+encodeURIComponent(x.trType===1?x.symbol:x.apiSymbol)+'&interval='+tf+'&limit=80';
    const res=await fetch(u,{signal:ctrl.signal,cache:'no-store'});
    if(!res.ok)throw Error('HTTP '+res.status);
    const body=await res.json(),data=body&&body.data;
    if(body.code!==0||!Array.isArray(data))throw Error('Mum yanıtı geçersiz');
    const bars=data.filter(c=>Array.isArray(c)&&c.length>=7&&Number(c[6])<Date.now()&&[2,4,5].every(i=>Number.isFinite(Number(c[i])))&&Number(c[4])>0&&Number(c[5])>=0);
    if(bars.length<55)throw Error('Yetersiz mum');
    return bars;
   }finally{clearTimeout(timer)}
  }));
  if(scanId!==requestId)return;
  let score=1;const parts=[];
  series.forEach((bars,i)=>{
   const closes=bars.map(c=>Number(c[4])),vols=bars.map(c=>Number(c[5])),e20=ema(closes,20),e50=ema(closes,50),r=rsi(closes);
   const avg=vols.slice(-21,-1).reduce((a,b)=>a+b,0)/20,rv=avg>0?vols.at(-1)/avg:0,last=closes.at(-1);
   const high=Math.max(...bars.slice(-21,-1).map(c=>Number(c[2])));
   const part=(e20>e50?12:0)+(last>e20?6:0)+(r>=50&&r<=70?5:0)+(rv>=1.8?5:0)+(last>=high*.98?5:0);
   score+=part;parts.push({tf:['5m','15m','1h'][i],score:part,trend:e20>e50?'Yukarı':'Aşağı',rsi:r,rvol:rv,near:last>=high*.98});
  });
  x.price=Number(series[0].at(-1)[4]);x.score=Math.min(100,score);x.scoreType='experimental';x.scoreParts=parts;
 }catch(err){x.scoreError=err.message}
}

// Experimental candle-based screening; not the desktop Python MTF 100 formula.
async function scoreBinanceCandidates(scanId, single, selectedMarket){
 const candidates=rows.filter(x=>x.symbol.endsWith('USDT')&&x.price!==null&&(single||x.quoteVolume>=20000000)).sort((a,b)=>(b.quoteVolume||0)-(a.quoteVolume||0)).slice(0,single?1:20);
 if(!candidates.length){$('notice').textContent='Günlük USDT işlem hacmi en az 20 milyon olan uygun aday bulunamadı. Tek Tara ile belirli bir sembolü inceleyebilirsiniz.';return;}
 $('notice').textContent='İlk +candidates.length+' USDT '+(selectedMarket==='FUTURES'?'Futures':'Spot')+' paritesi 5m/15m/1h kapanmış mumlarla deneysel olarak puanlanıyor. Toplu taramada en az 20 milyon USDT günlük hacim filtresi uygulanır; diğerlerinde skor yok.';
 let cursor=0,success=0,failed=0,firstError='';
 async function worker(){
  while(cursor<candidates.length&&scanId===requestId){
   const x=candidates[cursor++];
   try{
    const series=await Promise.all(['5m','15m','1h'].map(async interval=>{
     const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
     try{
      const base=selectedMarket==='FUTURES'?'https://fapi.binance.com/fapi/v1/klines':'https://api.binance.com/api/v3/klines';
      const u=base+'?symbol='+encodeURIComponent(x.symbol)+'&interval='+interval+'&limit=80';
      const response=await fetch(u,{signal:ctrl.signal,cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(!Array.isArray(data))throw Error('Mum formatı');
      const bars=data.filter(c=>Array.isArray(c)&&c.length>=7&&Number.isFinite(Number(c[6]))&&Number(c[6])<Date.now()&&[2,4,5].every(i=>Number.isFinite(Number(c[i])))&&Number(c[4])>0&&Number(c[5])>=0);
      if(bars.length<55)throw Error('Yetersiz mum');
      return bars;
     }finally{clearTimeout(timeout)}
    }));
    if(scanId!==requestId||market!==selectedMarket)return;
    let score=0,scoreParts=[];
    for(let i=0;i<series.length;i++){
     const bars=series[i];
     const closes=bars.map(c=>Number(c[4])),vols=bars.map(c=>Number(c[5]));
     const e20=ema(closes,20),e50=ema(closes,50),r=rsi(closes);
     const avg=vols.slice(-21,-1).reduce((a,b)=>a+b,0)/20;
     const rv=avg>0?vols.at(-1)/avg:0;
     const prevHigh=Math.max(...bars.slice(-21,-1).map(c=>Number(c[2])));
     const last=closes.at(-1);
     const part=(e20>e50?12:0)+(last>e20?6:0)+(r>=50&&r<=70?5:0)+(rv>=1.8?5:0)+(last>=prevHigh*.98?5:0);
     score+=part;scoreParts.push({tf:['5m','15m','1h'][i],score:part,trend:e20>e50?'Yukarı':'Aşağı',rsi:r,rvol:rv,near:last>=prevHigh*.98});
    }
    x.score=Math.min(100,score+1);x.scoreParts=scoreParts;x.scoreType='experimental';success++;
   }catch(err){failed++;if(!firstError)firstError=err.message||String(err)}
   if(scanId!==requestId)return;
   render();
   $('status').textContent='MTF ön tarama: '+(success+failed)+'/'+candidates.length+' | Puanlı: '+success+' | Hata: '+failed;
  }
 }
 await Promise.all(Array.from({length:3},()=>worker()));
 if(scanId!==requestId)return;
 $('notice').textContent='Deneysel '+(selectedMarket==='FUTURES'?'Futures':'Spot')+' MTF ön puanı: '+success+'/'+candidates.length+' parite hesaplandı. Sadece yüksek 24s hacimli ilk '+candidates.length+' aday incelendi.'+(failed?' Veri hatası: '+firstError+'.':'')+' Bu masaüstü Python MTF 100 skoru veya al/sat sinyali değildir.';
}

function ema(values,period){if(values.length<period)return null;const k=2/(period+1);let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;for(const v of values.slice(period))e=v*k+e*(1-k);return e}
function rsi(closes,period=14){if(closes.length<=period)return null;let gain=0,loss=0;for(let i=1;i<=period;i++){const d=closes[i]-closes[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}gain/=period;loss/=period;for(let i=period+1;i<closes.length;i++){const d=closes[i]-closes[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period}return loss===0?(gain===0?50:100):100-100/(1+gain/loss)}
async function analyzeFutures(symbol){
 const id=++detailRequestId,detail=$('detail');detail.textContent=symbol+' | 5m / 15m / 1h mumları alınıyor…';
 try{
  const intervals=['5m','15m','1h'];
  const series=await Promise.all(intervals.map(async interval=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{const url='https://fapi.binance.com/fapi/v1/klines?symbol='+encodeURIComponent(symbol)+'&interval='+interval+'&limit=100';const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error(interval+' HTTP '+response.status);const candles=await response.json();if(!Array.isArray(candles))throw Error(interval+' geçersiz mum verisi');const completed=candles.filter(c=>Array.isArray(c)&&c.length>=7&&Number.isFinite(Number(c[6]))&&Number(c[6])<Date.now()&&[1,2,3,4,5].every(i=>Number.isFinite(Number(c[i]))&&Number(c[i])>=0)&&Number(c[4])>0);if(completed.length<55)throw Error(interval+' yetersiz veya geçersiz kapanmış mum');return{interval,candles:completed}}finally{clearTimeout(timer)}
  }));
  if(id!==detailRequestId)return;
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
 }catch(err){if(id===detailRequestId)detail.textContent='MTF ön analizi alınamadı: '+err.message}
}

$('scan').addEventListener('click',()=>scan(false));$('single').addEventListener('click',()=>scan(true));
$('pythonBridgeSettings').hidden=false;
$('search').addEventListener('input',render);$('minScore').addEventListener('input',render);$('onlyStrong').addEventListener('change',render);
