// Prueba de punta a punta con Supabase simulado. Uso: npm test
// Capturas en tests/shots/. Sale con código 1 si algo falla.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');
const PORT=8790;const {srv,DB}=require('./fake-server.js')(path.join(__dirname,'..','index.html'),PORT);
const fake=fs.readFileSync(path.join(__dirname,'fake-supabase.js'),'utf8');const SH=path.join(__dirname,'shots');fs.mkdirSync(SH,{recursive:true});
let fails=0;const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const errs=[];
 const page=async(vp,locale)=>{const c=await b.newContext({viewport:vp,locale});await c.route('**/supabase-js@*/**',r=>r.fulfill({contentType:'text/javascript',body:fake}));const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));return p};
 const U='http://localhost:'+PORT+'/';
 try{
 console.log('Usuario nuevo (escritorio, es)');
 const p=await page({width:1280,height:900},'es-ES');await p.goto(U);await p.waitForTimeout(300);await p.screenshot({path:SH+'/01-login.png'});
 await p.click('[data-m="up"]');await p.fill('#gE','ana@x.com');await p.fill('#gP','secreto1');await p.click('#gOk');await p.waitForTimeout(400);
 ok(await p.isVisible('#wN'),'tras registrarse aparece el asistente');
 await p.fill('#wN','Ana');await p.click('#wNext');
 await p.fill('[data-wa="cuentas.0.saldo"]','1000');await p.click('[data-addacc="Revolut"]');await p.fill('[data-wa="cuentas.1.saldo"]','200');await p.selectOption('#wG','1');await p.click('#wNext');
 await p.click('[data-cf="1"]');await p.fill('[data-wa="cf.nombre"]','Edenred');await p.fill('[data-wa="cf.saldo"]','50');await p.fill('[data-wa="cf.recarga"]','150');await p.click('#wNext');
 await p.fill('[data-wa="sal.importe"]','1500');await p.fill('[data-wa="sal.dia"]','28');await p.fill('[data-wa="sal.rep.1"]','300');await p.click('[data-addpaga="12"]');await p.click('#wNext');
 await p.click('[data-addfix="alquiler"]');await p.fill('[data-wa="fijos.0.importe"]','600');await p.click('#wNext');
 await p.click('#wAddD');await p.fill('[data-wa="deudas.0.nombre"]','Coche');await p.fill('[data-wa="deudas.0.falta"]','3000');await p.fill('[data-wa="deudas.0.cuota"]','250');await p.click('#wNext');
 await p.fill('[data-wa="botes.0.saldo"]','500');await p.fill('[data-wa="botes.0.mensual"]','100');await p.screenshot({path:SH+'/02-asistente-botes.png'});await p.click('#wNext');
 await p.screenshot({path:SH+'/03-resumen.png'});await p.click('#wNext');await p.waitForTimeout(700);
 const cfg=DB.profiles[0]&&DB.profiles[0].config;
 ok(cfg&&cfg.cuentas.length===2&&cfg.cuentaGasto===cfg.cuentas[1].id,'config: 2 cuentas y la de gastos es Revolut');
 ok(cfg&&cfg.tarjeta.on&&cfg.tarjeta.nombre==='Edenred','config: tarjeta de comida');
 ok(cfg&&cfg.programados.some(x=>x.tipo==='pago'&&x.hasta),'config: la deuda tiene programado con fin');
 ok(await p.$eval('#gate',e=>e.hidden),'el asistente se cierra al terminar');
 ok((await p.textContent('#kCuenta')).includes('1200'),'Inicio: 1200 en cuentas');
 await p.screenshot({path:SH+'/04-inicio.png'});
 await p.click('#addBtn');await p.click('[data-cat="social"]');await p.click('#sheetBody [data-sub]');await p.fill('#aAmt','20');await p.click('#aSave');await p.waitForTimeout(400);
 ok((await p.textContent('#kCuenta')).includes('1180'),'registrar un gasto de 20 descuenta de la cuenta');
 await p.click('.nav[data-go="ajustes"]');await p.waitForTimeout(400);await p.click('#shNew');await p.waitForTimeout(400);
 const code=DB.shares[0]&&DB.shares[0].code;ok(!!code,'se crea un código de solo lectura');await p.screenshot({path:SH+'/05-ajustes.png'});
 console.log('Invitado con código (móvil)');
 const q=await page({width:390,height:844},'es-ES');await q.goto(U);await q.waitForTimeout(300);await q.click('[data-m="up"]');await q.fill('#gE','papa@x.com');await q.fill('#gP','secreto2');await q.click('#gOk');await q.waitForTimeout(400);
 await q.fill('#wCode',code.toLowerCase());await q.click('#wCodeB');await q.waitForTimeout(700);
 ok((await q.textContent('#hTitle')).includes('Ana'),'el invitado ve "Finanzas de Ana"');
 ok(await q.$eval('#fab',e=>e.hidden),'el invitado no tiene botón Registrar');
 const n0=DB.movimientos.length;await q.evaluate(()=>window.supabase.createClient().from('movimientos').insert({user_id:'x',fecha:'2026-01-01',data:{}}));ok(DB.movimientos.length===n0,'el invitado no puede escribir');
 ok(await q.evaluate(()=>document.documentElement.scrollWidth)<=390,'móvil sin scroll horizontal');await q.screenshot({path:SH+'/06-invitado-movil.png'});
 console.log('Asistente en inglés (móvil)');
 const e=await page({width:390,height:844},'en-US');await e.goto(U);await e.waitForTimeout(300);await e.click('[data-m="up"]');await e.fill('#gE','joe@x.com');await e.fill('#gP','secreto3');await e.click('#gOk');await e.waitForTimeout(400);
 ok((await e.textContent('.wt')).includes('Welcome'),'el asistente sale en inglés');await e.screenshot({path:SH+'/07-wizard-en.png'});
 }catch(err){console.log('  ✗ error:',err.message);fails++}
 ok(errs.length===0,'sin errores de JavaScript'+(errs.length?': '+errs.join(' | '):''));
 await b.close();srv.close();console.log(fails?`\n${fails} fallo(s)`:'\nTodo bien');process.exit(fails?1:0)})();
