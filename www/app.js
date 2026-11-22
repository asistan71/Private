'use strict';
const demo=[{symbol:'THYAO',price:null,change:null,score:82},{symbol:'ASELS',price:null,change:null,score:79},{symbol:'TUPRS',price:null,change:null,score:74},{symbol:'BIMAS',price:null,change:null,score:68}];
let market='BIST',rows=[],source='demo';
const $=id=>document.getElementById(id);
function render(){
 const q=$('search').value.trim().toLocaleUpperCase('tr-TR'),min=Number($('minScore').value)||0;
 const filtered=rows.filter(x=>x.symbol.includes(q)&&(x.score===null||x.score>=min)&&(!$('onlyStrong').checked||(x.score!==null&&x.score>=80)));
 $('results').replaceChildren();
 for(const x of filtered){const tr=document.createElement('tr');tr.dataset.symbol=x.symbol;
 [x.symbol,x.price==null?'—':Number(x.price).toLocaleString('tr-TR',{maximumFractionDigits:8}),x.change==null?'—':Number(x.change).toFixed(2)+'%',x.score==null?'—':String(x.score),x.score==null?'Skor hesaplanmadı':x.score>=80?'Güçlü izleme':x.score>=70?'İzleme':'Bekle'].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===2&&x.change!=null)td.className=x.change>=0?'up':'down';tr.append(td)});
 tr.addEventListener('click',()=>{$('detail').textContent=x.symbol+' | '+(source==='live'?'Canlı piyasa verisi; strateji skoru ve işlem planı hesaplanmadı.':'DEMO: Fiyat ve skor gerçek tarama sonucu değildir.')});$('results').append(tr)}
 $('status').textContent=filtered.length+' '+(source==='live'?'piyasa kaydı':'örnek aday');
}
function reset(){rows=[];$('results').replaceChildren();$('detail').textContent='';$('status').textContent='Veri bekleniyor';$('universe').textContent=market==='BIST'?'Evren: 631 (hedef)':'Evren: veri bekleniyor';$('notice').textContent=market==='BIST'?'BIST canlı veri sağlayıcısı bağlı değil; demo yalnızca arayüz testidir.':'Canlı fiyat sorgusu yapılabilir. Strateji skoru henüz hesaplanmıyor.';}
document.querySelectorAll('[data-market]').forEach(b=>b.addEventListener('click',()=>{market=b.dataset.market;document.querySelectorAll('[data-market]').forEach(x=>x.classList.toggle('active',x===b));reset()}));
async function scan(single=false){
 const symbol=$('search').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(single&&!symbol){$('status').textContent='Önce sembol yazın';return}
 if(market==='BIST'){source='demo';rows=single?demo.filter(x=>x.symbol===symbol):demo.slice();$('notice').textContent='DEMO: Skorlar örnektir; güncel fiyat, canlı sinyal veya yatırım tavsiyesi değildir.';render();return}
 const url=market==='BINANCE'?'https://api.binance.com/api/v3/ticker/24hr':'https://api.binance.tr/api/v3/ticker/24hr';
 $('status').textContent='Veri alınıyor…';
 try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 let response;try{response=await fetch(url,{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timeout)}
 if(!response.ok)throw new Error('HTTP '+response.status);
 const data=await response.json();if(!Array.isArray(data))throw new Error('Beklenmeyen veri biçimi');
 source='live';rows=data.filter(x=>typeof x.symbol==='string'&&(!single||x.symbol===symbol)).slice(0,single?1:500).map(x=>({symbol:x.symbol,price:Number(x.lastPrice),change:Number(x.priceChangePercent),score:null}));
 $('universe').textContent='Getirilen kayıt: '+rows.length;
 $('notice').textContent='24 saatlik fiyat/değişim verisi. BIST 631 hisse taraması ve MTF 100 puanlama henüz bağlı değil. Fiyat verisi gecikmeli olabilir.';render();
 if(!rows.length)$('status').textContent='Eşleşen sembol bulunamadı';
 }catch(err){rows=[];$('results').replaceChildren();$('status').textContent='Veri alınamadı';$('notice').textContent='Bağlantı, CORS veya servis kısıtlaması: '+err.message+'. Veri uydurulmadı.'}
}
$('scan').addEventListener('click',()=>scan(false));$('single').addEventListener('click',()=>scan(true));
$('search').addEventListener('input',render);$('minScore').addEventListener('input',render);$('onlyStrong').addEventListener('change',render);
