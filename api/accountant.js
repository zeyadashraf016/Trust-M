'use strict';
const {createClient}=require('../assets/supabase-2.49.4.js');
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,portal=process.env.PORTAL_URL;
 if(!url||!key||!portal)return res.status(503).json({error:'ACCOUNT_SETUP_NOT_CONFIGURED'});
 try{
  const redirect=new URL('activate-account.html',portal.endsWith('/')?portal:portal+'/');if(redirect.protocol!=='https:')throw Error('Invalid portal URL');
  const token=String(req.headers.authorization||'').replace(/^Bearer /i,'');if(!token)return res.status(401).json({error:'UNAUTHENTICATED'});
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:user,error:authError}=await sb.auth.getUser(token);
  if(authError||!user.user)return res.status(401).json({error:'UNAUTHENTICATED'});
  const {data:owner,error:profileError}=await sb.from('profiles').select('role,is_active').eq('id',user.user.id).single();
  if(profileError||owner?.role!=='lamiaa_owner'||!owner.is_active)return res.status(403).json({error:'FORBIDDEN'});
  // This endpoint provisions only the accountant requested by the owner.
  const email='ashraf@gmail.com',name='Ashraf Osama';let accountant=null;
  for(let page=1;page<=100;page++){const {data,error}=await sb.auth.admin.listUsers({page,perPage:100});if(error)throw error;accountant=data.users.find(u=>u.email?.toLowerCase()===email);if(accountant||data.users.length<100)break;}
  let invited=false;
  if(!accountant){const {data,error}=await sb.auth.admin.inviteUserByEmail(email,{data:{full_name:name},redirectTo:redirect.href});if(error)throw error;accountant=data.user;invited=true;}
  const {data:existing}=await sb.from('profiles').select('role').eq('id',accountant.id).maybeSingle();
  if(existing&&existing.role!=='accountant')return res.status(409).json({error:'EXISTING_ACCOUNT_HAS_ANOTHER_ROLE'});
  const {error}=await sb.from('profiles').upsert({id:accountant.id,full_name:name,role:'accountant',is_active:true});if(error)throw error;
  await sb.from('audit_log').insert({actor_id:user.user.id,action:'provision',entity_type:'accountant',entity_id:accountant.id,details:{email,invited}});
  return res.status(200).json({email,name,invited});
 }catch(error){console.error('Accountant provisioning failed:',error.code||error.name);return res.status(500).json({error:'ACCOUNT_SETUP_FAILED'});}
};
