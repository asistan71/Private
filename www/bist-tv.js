/* Experimental Android TradingView chart adapter. Unauthenticated quotes may be delayed.
 * One symbol / three frames. No user credentials and no server dependency. */
'use strict';
globalThis.BistTV = (() => {
 const WS='wss://data.tradingview.com/socket.io/websocket?type=chart';
 const makeId=()=>Math.random().toString(36).slice(2,14).padEnd(12,'x');
 const frame=o=>{const s=JSON.stringify(o);return '~m~'+new TextEncoder().encode(s).length+'~m~'+s};
 function fetchOne(symbol,tf,interval,{timeout=18000}={}){
  return new Promise((resolve,reject)=>{
   if(!/^[A-Z0-9]{4,6}$/.test(symbol)){reject(Error('Geçersiz sembol'));return}
   const ws=new WebSocket(WS),session='cs_'+makeId(),out={};
   let buffer='',done=false,lastEvent='Bağlantı açılmadı';
   const timer=setTimeout(()=>finish(Error('TradingView zaman aşımı | '+lastEvent+' | gelen seriler: '+(out[tf]?.length||0)+' mum')),timeout);
   function finish(err){if(done)return;done=true;clearTimeout(timer);try{ws.close()}catch(_){};err?reject(err):resolve(out[tf])}
   function send(m,p){if(ws.readyState===WebSocket.OPEN)ws.send(frame({m,p}))}
   ws.onopen=()=>{
    lastEvent='WebSocket açıldı';
    send('set_auth_token',['unauthorized_user_token']);
    send('chart_create_session',[session,'']);
    send('resolve_symbol',[session,'sym_1','='+JSON.stringify({symbol:'BIST:'+symbol,adjustment:'splits',session:'regular'})]);
    send('create_series',[session,'ser_1','s_ser_1','sym_1',interval,240,'']);
   };
   ws.onerror=()=>finish(Error('TradingView WebSocket ağ/erişim hatası | '+lastEvent));
   ws.onclose=e=>{if(!done)finish(Error('TradingView bağlantısı kapandı (kod '+e.code+') | '+lastEvent))};
   ws.onmessage=event=>{
    buffer+=String(event.data);
    // Frames may be coalesced; parse ~m~len~m~payload.
    while(buffer.startsWith('~m~')){
     const p=buffer.indexOf('~m~',3);if(p<0)break;
     const len=Number(buffer.slice(3,p));if(!Number.isInteger(len)||len<0||len>10000000){finish(Error('Geçersiz veri çerçevesi'));return}
     const start=p+3;if(buffer.length<start+len)break;
     const body=buffer.slice(start,start+len);buffer=buffer.slice(start+len);
     if(body.startsWith('~h~')){try{ws.send('~m~'+body.length+'~m~'+body)}catch(_){};continue}
     let msg;try{msg=JSON.parse(body)}catch(_){continue}
     lastEvent=String(msg.m||'mesaj');
     if(msg.m==='symbol_error'||msg.m==='series_error'||msg.m==='critical_error'){finish(Error('TradingView '+msg.m+': '+JSON.stringify(msg.p||[]).slice(0,180)));return}
     if(!['timescale_update','du','series_completed'].includes(msg.m))continue;
     const payload=msg.p||[];
     for(const item of payload){
      if(!item||typeof item!=='object')continue;
      const data=item.ser_1?.s;
      if(!Array.isArray(data))continue;
      const bars=data.map(x=>x?.v).filter(v=>Array.isArray(v)&&v.length>=5&&v.slice(0,5).every(Number.isFinite))
       .map(v=>({ts:v[0],open:v[1],high:v[2],low:v[3],close:v[4],volume:Number.isFinite(v[5])&&v[5]>=0?v[5]:null}));
      if(bars.length)out[tf]=bars;
     }
     if((out[tf]?.length||0)>=60){finish();return}
    }
   };
  });
 }
 async function fetchHistory(symbol,opts={}){
  const out={};
  for(const [tf,interval] of [['1W','W'],['1D','D'],['1H','60']]){
   try{out[tf]=await fetchOne(symbol,tf,interval,opts)}
   catch(e){throw Error(tf+' veri alımı: '+e.message)}
  }
  return out;
 }
 return {fetchHistory};
})();
