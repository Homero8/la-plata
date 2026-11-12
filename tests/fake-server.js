const http=require('http'),fs=require('fs'),crypto=require('crypto');
module.exports=function(htmlPath,port){
const DB={users:[],profiles:[],movimientos:[],notas:[],shares:[]};
const canView=(me,owner)=>owner===me||DB.shares.some(s=>s.owner_id===owner&&s.viewer_id===me);
const rules={profiles:{sel:(me,r)=>canView(me,r.user_id),wr:(me,r)=>r.user_id===me,key:"user_id"},movimientos:{sel:(me,r)=>canView(me,r.user_id),wr:(me,r)=>r.user_id===me,key:"id"},
  notas:{sel:(me,r)=>r.user_id===me,wr:(me,r)=>r.user_id===me,key:"id"},shares:{sel:(me,r)=>r.owner_id===me||r.viewer_id===me,wr:(me,r)=>r.owner_id===me,del:(me,r)=>r.owner_id===me||r.viewer_id===me,key:"id"}};
let html=fs.readFileSync(htmlPath,'utf8').replace(/const SUPABASE_URL="[^"]*";/,'const SUPABASE_URL="http://x";').replace(/const SUPABASE_KEY="[^"]*";/,'const SUPABASE_KEY="k";');
const fake=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
const srv=http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{
  if(q.url.startsWith('/fake-sb.js')){r.setHeader('content-type','text/javascript');return r.end(fake)}
  if(q.method!=='POST'){r.setHeader('content-type','text/html');return r.end(html)}
  const me=q.headers['x-user']||null,j=JSON.parse(b||'{}');const out=o=>r.end(JSON.stringify(o));
  if(q.url==='/auth'){if(j.op==='up'){if(DB.users.find(u=>u.email===j.email))return out({error:{message:'User already registered'}});const u={id:crypto.randomUUID(),email:j.email,pw:j.password};DB.users.push(u);return out({user:{id:u.id,email:u.email}})}
    const u=DB.users.find(u=>u.email===j.email&&u.pw===j.password);return u?out({user:{id:u.id,email:u.email}}):out({error:{message:'Invalid login credentials'}})}
  if(!me)return out({error:{message:'no auth'}});
  if(q.url==='/rpc'){if(j.fn==='redeem_share'){const s=DB.shares.find(s=>s.code.toUpperCase()===String(j.args.p_code).trim().toUpperCase()&&!s.viewer_id&&s.owner_id!==me);if(!s)return out({data:[]});s.viewer_id=me;return out({data:[{owner_id:s.owner_id,owner_name:s.owner_name}]})}
    if(j.fn==='delete_my_account'){DB.users=DB.users.filter(u=>u.id!==me);for(const t of ['profiles','movimientos','notas'])DB[t]=DB[t].filter(x=>x.user_id!==me);DB.shares=DB.shares.filter(s=>s.owner_id!==me&&s.viewer_id!==me);return out({data:null})}}
  const R=rules[j.table],T=DB[j.table];const match=row=>j.filters.every(([k,v])=>row[k]===v);
  if(j.op==='select'){let rows=T.filter(x=>R.sel(me,x)&&match(x));rows=rows.slice().sort((a,b)=>{for(const k of j.order){if(a[k]<b[k])return-1;if(a[k]>b[k])return 1}return 0});if(j.range)rows=rows.slice(j.range[0],j.range[1]+1);rows=JSON.parse(JSON.stringify(rows));return out({data:j.single?(rows[0]||null):rows})}
  const arr=Array.isArray(j.payload)?j.payload:[j.payload];
  if(j.op==='insert'||j.op==='upsert'){for(const p of arr){if(!R.wr(me,p))return out({error:{message:'RLS violation'}});const row=Object.assign({id:crypto.randomUUID(),created_at:new Date(Date.now()+DB.movimientos.length).toISOString()},p);
      if(j.op==='upsert'){const i=T.findIndex(x=>x[R.key]===row[R.key]);if(i>=0){if(!R.wr(me,T[i]))return out({error:{message:'RLS'}});T[i]=Object.assign(T[i],p);continue}}T.push(row)}return out({data:null})}
  if(j.op==='update'){T.filter(x=>match(x)&&R.wr(me,x)).forEach(x=>Object.assign(x,j.payload));return out({data:null})}
  if(j.op==='delete'){const del=R.del||R.wr;DB[j.table]=T.filter(x=>!(match(x)&&del(me,x)));return out({data:null})}
  out({error:{message:'?'}})})}).listen(port);
return{srv,DB}};
