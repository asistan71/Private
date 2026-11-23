/* Experimental Android TradingView chart adapter. Unauthenticated quotes may be delayed.
 * One symbol / three frames. No user credentials and no server dependency. */
'use strict';
globalThis.BistTV = (() => {
 const WS='wss://data.tradingview.com/socket.io/websocket?type=chart';
 const makeId=()=>Math.random().toString(36).slice(2,14).padEnd(12,'x');
 const frame=o=>{const s=JSON.stringify(o);return '~m~'+new TextEncoder().encode(s).length+'~m~'+s};
 function fetchHistory(symbol,{timeout=25000}={}){
  return new Promise((resolve,reject)=>{
   if(!/^[A-Z0-9]{4,6}$/.test(symbol)){reject(Error('Geçersiz sembol'));return}
   const ws=new WebSocket(WS),session='cs_'+makeId(),out={},series={ser_w:'1W',ser_d:'1D',ser_h:'1H'};
   let buffer='',done=false;
   const timer=setTimeout(()=>finish(Error('TradingView bağlantısı zaman aşımı')),timeout);
   function finish(err){if(done)return;done=true;clearTimeout(timer);try{ws.close()}catch(_){};err?reject(err):resolve(out)}
   function send(m,p){if(ws.readyState===WebSocket.OPEN)ws.send(frame({m,p}))}
   ws.onopen=()=>{
    send('set_auth_token',['unauthorized_user_token']);
    send('chart_create_session',[session,'']);
    send('resolve_symbol',[session,'sym_1','='+JSON.stringify({symbol:'BIST:'+symbol,adjustment:'splits',session:'regular'})]);
    for(const [id,tf,n] of [['ser_w','W',180],['ser_d','D',240],['ser_h','60',240]])
     send('create_series',[session,id,'s_'+id,'sym_1',tf,n,'']);
   };
   ws.onerror=()=>finish(Error('TradingView WebSocket bağlantısı kurulamadı'));
   ws.onclose=()=>{if(!done)finish(Error('TradingView bağlantısı kapandı'))};
   ws.onmessage=event=>{
    buffer+=String(event.data);
    // Frames may be coalesced; parse ~m~len~m~payload.
    while(buffer.startsWith('~m~')){
     const p=buffer.indexOf('~m~',3);if(p<0)break;
     const len=Number(buffer.slice(3,p));if(!Number.isInteger(len)||len<0||len>10000000){finish(Error('Geçersiz veri çerçevesi'));return}
     const start=p+3;if(buffer.length<start+len)break;
     const body=buffer.slice(start,start+len);buffer=buffer.slice(start+len);
     if(body.startsWith('~h~')){try{ws.send(frame(body))}catch(_){};continue}
     let msg;try{msg=JSON.parse(body)}catch(_){continue}
     if(msg.m==='symbol_error'||msg.m==='series_error'){finish(Error('BIST sembolü veya seri reddedildi'));return}
     if(!['timescale_update','du','series_completed'].includes(msg.m))continue;
     const payload=msg.p||[];
     for(const item of payload){
      if(!item||typeof item!=='object')continue;
      for(const [id,tf] of Object.entries(series)){
       const data=item[id]?.s;
       if(!Array.isArray(data))continue;
       const bars=data.map(x=>x?.v).filter(v=>Array.isArray(v)&&v.length>=5&&v.slice(0,5).every(Number.isFinite))
        .map(v=>({ts:v[0],open:v[1],high:v[2],low:v[3],close:v[4],volume:Number.isFinite(v[5])?v[5]:0}));
       if(bars.length)out[tf]=bars;
      }
     }
     if(Object.keys(out).length===3&&Object.values(out).every(x=>x.length>=60)){finish();return}
    }
   };
  });
 }
 return {fetchHistory};
})();
