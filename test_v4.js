'use strict';
var {JSDOM} = require('jsdom');
var fs = require('fs');

var v40html = fs.readFileSync(__dirname+'/index.html','utf8');
var commonJs = fs.readFileSync('C:\\Users\\李明鎬\\Documents\\LEENAI_COMMON\\v1\\leenai-common.js','utf8');

function getLastJs(h){
  var m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return m.length>0?m[m.length-1][1]:'';
}
function getBody(h){
  var m=h.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m?m[1].replace(/<script[\s\S]*?<\/script>/gi,''):'';
}

function mkDOM(html){
  var dom=new JSDOM('<!DOCTYPE html><html><head></head><body>'+getBody(html)+'</body></html>',
    {url:'https://mhlee205.github.io/SHIPPING_SCHEDULE/',runScripts:'outside-only',pretendToBeVisual:true});
  var w=dom.window;
  function def(k,v){Object.defineProperty(w,k,{value:v,writable:true,configurable:true});}
  def('crypto',{subtle:{digest:async()=>new ArrayBuffer(32)},getRandomValues:function(a){for(var i=0;i<a.length;i++)a[i]=i%256;return a;}});
  def('sessionStorage',{_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;},removeItem:function(k){delete this._d[k];}});
  def('localStorage',{_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;},removeItem:function(k){delete this._d[k];}});
  def('history',{replaceState:function(){}});
  def('requestAnimationFrame',function(cb){setTimeout(cb,0);});
  var realGet=w.document.getElementById.bind(w.document);
  w.document.getElementById=function(id){var el=realGet(id);if(el) return el;return {style:{display:''},textContent:'',innerHTML:''};};
  return dom;
}

var FAKE_ROWS=[{buyer:'BUYER_A',agent:'AGT_X',invoiceNo:'NMG2607-07',blNo:'BL001',
  bookingNo:'BK001',vessel:'VESSEL',carrier:'MSC',pol:'NAGOYA',pod:'HCM',
  blDate:'2026/08/20',blDateRaw:new Date('2026-08-20'),eta:'2026/09/10',etdRaw:new Date('2026-08-15'),
  coNo:'NSG-01',poNo:'NSG-01',container:'1',
  nwMap:{'NSG-01||OCC||255':20.00},qtyMap:{'NSG-01||OCC||255':100}}];
var MM={'AGT_X::BUYER_A':{to:'buyer@test.com',cc:'cc@test.com',agent:'AGT_X',buyer:'BUYER_A'}};

var dom=mkDOM(v40html);
var w=dom.window;
w.eval(commonJs);
w.eval(getLastJs(v40html));

// 스텁
w.renderStats=function(){};
w.renderTable=function(){};
w.buildBuyerData(FAKE_ROWS,MM);

var passed=0,failed=0;
function ok(label,cond){
  if(cond){console.log('  ✔ '+label);passed++;}
  else{console.error('  ✖ FAIL: '+label);failed++;}
}

console.log('\n[TEST 1] buildBuyerData 결과');
ok('buyerData.length===1', w.buyerData.length===1);
ok('buyer=BUYER_A', w.buyerData[0].buyer==='BUYER_A');
ok('sendType=importer', w.buyerData[0].sendType==='importer');
ok('emailTo=buyer@test.com', w.buyerData[0].emailTo==='buyer@test.com');
ok('rows.length===1', w.buyerData[0].rows.length===1);

console.log('\n[TEST 2] buildMailto 형식');
var mt=w.buildMailto(w.buyerData[0]);
ok('mailto:로 시작', mt.startsWith('mailto:'));
ok('BUYER_A 포함', mt.includes(encodeURIComponent('BUYER_A')));

console.log('\n[TEST 3] 날짜 유틸');
ok('dateToYMD', w.dateToYMD(new Date('2026-08-20'))==='2026/08/20');
ok('todayYMD 8자리', w.todayYMD().length===8);

console.log('\n[TEST 4] 삭제 함수 없음');
ok('startOAuthFlow 無', typeof w.startOAuthFlow==='undefined');
ok('exchangeCodeForToken 無', typeof w.exchangeCodeForToken==='undefined');
ok('silentRefresh 無', typeof w.silentRefresh==='undefined');
ok('checkTokenExpiry 無', typeof w.checkTokenExpiry==='undefined');
ok('getD365Token 無', typeof w.getD365Token==='undefined');
ok('toggleTheme 無', typeof w.toggleTheme==='undefined');
ok('graphToken 無', typeof w.graphToken==='undefined');

console.log('\n[TEST 5] LEENAI API 있음');
ok('LEENAI 있음', typeof w.LEENAI==='object');
ok('LEENAI.auth 있음', typeof w.LEENAI.auth==='object');
ok('LEENAI.sp 있음', typeof w.LEENAI.sp==='object');

console.log('\n[TEST 6] 메일 본문 일치 (v3.11 기준값 하드코딩)');
var mb=w.buildMailto(w.buyerData[0]);
ok('rcp@leenearcorp.com CC포함', mb.includes(encodeURIComponent('rcp@leenearcorp.com')));

console.log('\n─────────────────────────');
console.log('결과: PASS '+passed+' / FAIL '+failed);
process.exit(failed>0?1:0);
