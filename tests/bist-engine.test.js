// Run: node tests/bist-engine.test.js
const assert=require('node:assert/strict');
const e=require('../www/bist-engine.js');
const make=(n=120)=>{const close=Array.from({length:n},(_,i)=>100+i*.5),high=close.map(x=>x+1),low=close.map(x=>x-1),volume=close.map((_,i)=>i===n-1?4000:1000);return {close,high,low,volume,lastDate:'2020-01-01'}};
const raw={'1W':make(),'1D':make(),'1H':make()};
assert.equal(e.ema([1,2,3,4,5],3)>0,true);
assert.equal(e.rsi(Array.from({length:40},(_,i)=>i+1)),100);
const r=e.score('THYAO',raw,{now:new Date('2026-11-23T19:00:00'),capital:100000,riskPercent:2});
assert.equal(r.Sembol,'THYAO');assert.ok(r.Puan>=70);assert.equal(r.Sinyal,'TEYITLI LONG');assert.ok(r.Stop<r.Giris&&r.TP1>r.Giris);assert.equal(r.PlanTF,'1H');
assert.equal(e.score('THYAO',{'1W':make(20),'1D':make(),'1H':make()}).Hata,'İndikatör için yetersiz mum');
const weak=make();weak.volume[weak.volume.length-1]=1;
assert.equal(e.score('THYAO',{'1W':make(),'1D':weak,'1H':make()}).Filtre,'Hacim filtresi');
console.log('BIST JS engine tests OK');
