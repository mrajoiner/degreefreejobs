const accountJSON=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const profileFields=['name','phone','address','city','state','zip'];
export function cleanProfile(value={}){return Object.fromEntries(profileFields.map(k=>[k,String(value[k]||'').trim().slice(0,k==='address'?300:120)]));}
export function identity(request){const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');return id&&email?{id,email:email.toLowerCase()}:null;}
async function audit(env,actor,action,target){await env.DB.prepare('INSERT INTO audit_log(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,new Date().toISOString()).run();}
function accountPublic(row){return {id:row.id,email:row.email,role:row.role,status:row.status,profile:JSON.parse(row.profile),resumeName:row.resume_name,hasResume:!!row.resume_key||!!row.resume_text,createdAt:row.created_at,updatedAt:row.updated_at};}
async function eraseResume(env,row){if(row.resume_key)await env.BUCKET.delete(row.resume_key);await env.DB.prepare("UPDATE accounts SET resume_key=NULL,resume_name=NULL,resume_text='',updated_at=? WHERE id=?").bind(new Date().toISOString(),row.id).run();}
export async function accountRoutes(request,env){const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/account')&&!path.startsWith('/api/admin'))return null;
 const user=identity(request);if(!user)return accountJSON({error:'Sign in to continue.'},401);
 if(!env.DB||!env.BUCKET)return accountJSON({error:'Account storage is unavailable. Please try again later.'},503);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return accountJSON({error:'Request origin rejected.'},403);
 if(!['GET','HEAD'].includes(request.method)){const maximum=path==='/api/account/resume'?11*1024*1024:8192;const reader=request.body?.getReader();let length=0,chunks=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maximum){await reader.cancel();return accountJSON({error:'Request too large.'},413);}chunks.push(value);}}const body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}request=new Request(request.url,{method:request.method,headers:request.headers,body:body.length?body:undefined});}
 const owner=user.email===env.ADMIN_EMAIL?.toLowerCase();
 let row=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(user.id).first();
 if(row?.status==='suspended')return accountJSON({error:'Your account is suspended. Contact the operator.'},403);
 if(path==='/api/account/session'&&request.method==='GET')return accountJSON({identity:user,account:row?accountPublic(row):null,isAdmin:owner||row?.role==='admin'});
 if(path==='/api/account'&&request.method==='POST'){
 if(Number(request.headers.get('content-length'))>8192)return accountJSON({error:'Request too large.'},413);
 const body=await request.json();if(String(body.email||'').trim().toLowerCase()!==user.email)return accountJSON({error:'Use the email associated with your verified sign-in.'},400);
 const now=new Date().toISOString(),profile=JSON.stringify(cleanProfile(body.profile));
 await env.DB.prepare('INSERT INTO accounts(id,email,role,profile,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,profile=excluded.profile,updated_at=excluded.updated_at').bind(user.id,user.email,owner?'admin':'user',profile,now,now).run();
 await audit(env,user.id,row?'profile.updated':'account.created',user.id);row=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(user.id).first();return accountJSON({account:accountPublic(row)});
 }
 if(path.startsWith('/api/admin')){
 if(!owner&&row?.role!=='admin')return accountJSON({error:'Administrator access required.'},403);
 if(path==='/api/admin/users'&&request.method==='GET'){const offset=Math.max(0,Math.min(100000,parseInt(url.searchParams.get('offset'))||0));const result=await env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC LIMIT 51 OFFSET ?').bind(offset).all();return accountJSON({users:result.results.slice(0,50).map(accountPublic),next:result.results.length>50?offset+50:null});}
 if(path==='/api/admin/audit'&&request.method==='GET'){const result=await env.DB.prepare('SELECT actor,action,target,created_at FROM audit_log ORDER BY created_at DESC LIMIT 100').all();return accountJSON({events:result.results});}
 const match=path.match(/^\/api\/admin\/users\/([^/]+)(\/resume)?$/);if(!match)return accountJSON({error:'Not found'},404);
 const target=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(decodeURIComponent(match[1])).first();if(!target)return accountJSON({error:'Account not found.'},404);
 if(match[2]&&request.method==='GET'){await audit(env,user.id,'resume.downloaded',target.id);return downloadResume(env,target);}
 if(request.method==='PATCH'){
 const body=await request.json();if(target.id===user.id||target.email===env.ADMIN_EMAIL?.toLowerCase())return accountJSON({error:'The owner and your own administrator access cannot be changed here.'},400);
 if(!['active','suspended'].includes(body.status)||!['admin','user'].includes(body.role))return accountJSON({error:'Invalid account settings.'},400);
 await env.DB.prepare('UPDATE accounts SET status=?,role=?,updated_at=? WHERE id=?').bind(body.status,body.role,new Date().toISOString(),target.id).run();await audit(env,user.id,'account.permissions.updated',target.id);return accountJSON({ok:true});}
 if(request.method==='DELETE'){if(target.id===user.id||target.email===env.ADMIN_EMAIL?.toLowerCase())return accountJSON({error:'The owner and your own administrator account cannot be deleted here.'},400);await eraseResume(env,target);await env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(target.id).run();await audit(env,user.id,'account.deleted',target.id);return accountJSON({ok:true});}
 return accountJSON({error:'Method not allowed.'},405);
 }
 if(!row)return accountJSON({error:'Create your account before saving a resume.'},409);
 if(path==='/api/account'&&request.method==='GET')return accountJSON({account:accountPublic(row),text:row.resume_text});
 if(path==='/api/account'&&request.method==='DELETE'){if(owner)return accountJSON({error:'The site owner account cannot be deleted here. You can remove your resume.'},400);await eraseResume(env,row);await env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(user.id).run();await audit(env,user.id,'account.self_deleted',user.id);return accountJSON({ok:true});}
 if(path==='/api/account/resume'&&request.method==='GET')return downloadResume(env,row);
 if(path==='/api/account/resume'&&request.method==='DELETE'){await eraseResume(env,row);await audit(env,user.id,'resume.removed',user.id);return accountJSON({ok:true});}
 if(path==='/api/account/resume'&&request.method==='POST'){
 if(Number(request.headers.get('content-length'))>11*1024*1024)return accountJSON({error:'Choose a resume under 10 MB.'},413);
 const data=await request.formData(),file=data.get('file'),text=String(data.get('text')||'');if(text.length<30||text.length>60000)return accountJSON({error:'Resume text must contain 30–60,000 characters.'},400);
 let key=null,name=null;if(file&&typeof file!=='string'){
 if(file.size>10*1024*1024||!file.size||!/[.](pdf|docx|txt)$/i.test(file.name))return accountJSON({error:'Choose a PDF, DOCX, or text file under 10 MB.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer()),ext=file.name.split('.').pop().toLowerCase();if((ext==='pdf'&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')||(ext==='docx'&&(bytes[0]!==80||bytes[1]!==75)))return accountJSON({error:'File content does not match its extension.'},400);
 key='resumes/'+encodeURIComponent(user.id)+'/'+crypto.randomUUID();name=file.name.replace(/[\x00-\x1f"\\/]/g,'_').slice(0,180);await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
 }
 try{await env.DB.prepare('UPDATE accounts SET resume_key=?,resume_name=?,resume_text=?,updated_at=? WHERE id=?').bind(key,name,text,new Date().toISOString(),user.id).run();}catch(e){if(key)await env.BUCKET.delete(key);throw e;}
 if(row.resume_key)await env.BUCKET.delete(row.resume_key);await audit(env,user.id,'resume.saved',user.id);return accountJSON({ok:true});
 }
 return accountJSON({error:'Method not allowed.'},405);
}
async function downloadResume(env,row){const headers={'content-type':'application/octet-stream','content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(row.resume_name||'resume.txt'),'cache-control':'no-store, private','x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'"};if(row.resume_key){const file=await env.BUCKET.get(row.resume_key);if(file)return new Response(file.body,{headers});}if(row.resume_text)return new Response(row.resume_text,{headers});return accountJSON({error:'No saved resume.'},404);}
