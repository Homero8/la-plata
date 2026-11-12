// Cliente Supabase falso: reenvía todo a /db del servidor de pruebas
(function(){
function Q(table){this.q={table,op:"select",filters:[],order:[],range:null,single:false,cols:"*"}}
Q.prototype.select=function(c){if(this.q.op==="select")this.q.cols=c||"*";return this};
Q.prototype.insert=function(p){this.q.op="insert";this.q.payload=p;return this};
Q.prototype.upsert=function(p){this.q.op="upsert";this.q.payload=p;return this};
Q.prototype.update=function(p){this.q.op="update";this.q.payload=p;return this};
Q.prototype.delete=function(){this.q.op="delete";return this};
Q.prototype.eq=function(k,v){this.q.filters.push([k,v]);return this};
Q.prototype.order=function(k){this.q.order.push(k);return this};
Q.prototype.range=function(a,b){this.q.range=[a,b];return this};
Q.prototype.maybeSingle=function(){this.q.single=true;return this};
Q.prototype.then=function(res,rej){return call("/db",this.q).then(res,rej)};
function tok(){return localStorage.getItem("fake_tok")||""}
function call(path,body){return fetch(path,{method:"POST",headers:{"content-type":"application/json","x-user":tok()},body:JSON.stringify(body)}).then(r=>r.json())}
window.supabase={createClient(){return{
  from:t=>new Q(t),
  rpc:(fn,args)=>call("/rpc",{fn,args}),
  auth:{
    async getSession(){const t=tok();if(!t)return{data:{session:null}};const u=JSON.parse(localStorage.getItem("fake_user"));return{data:{session:{user:u}}}},
    async signInWithPassword(c){const r=await call("/auth",Object.assign({op:"in"},c));if(r.error)return{error:r.error};localStorage.setItem("fake_tok",r.user.id);localStorage.setItem("fake_user",JSON.stringify(r.user));return{data:{user:r.user,session:{user:r.user}}}},
    async signUp(c){const r=await call("/auth",Object.assign({op:"up"},c));if(r.error)return{error:r.error};localStorage.setItem("fake_tok",r.user.id);localStorage.setItem("fake_user",JSON.stringify(r.user));return{data:{user:r.user,session:{user:r.user}}}},
    async signOut(){localStorage.removeItem("fake_tok");localStorage.removeItem("fake_user");return{}},
    onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},
    async resetPasswordForEmail(){return{}},async updateUser(){return{data:{}}}
  }}}};
})();
