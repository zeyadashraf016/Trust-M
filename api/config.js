'use strict';

module.exports=function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');

  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  }

  const supabaseUrl=String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'').trim();
  const supabasePublishableKey=String(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'').trim();
  const missing=[];
  if(!supabaseUrl)missing.push('SUPABASE_URL');
  if(!supabasePublishableKey)missing.push('SUPABASE_PUBLISHABLE_KEY');
  if(missing.length)return res.status(503).json({error:'CONFIG_INCOMPLETE',missing});

  try{
    const parsed=new URL(supabaseUrl);
    if(parsed.protocol!=='https:')throw new Error('Supabase URL must use HTTPS.');
  }catch(error){
    return res.status(503).json({error:'CONFIG_INVALID',field:'SUPABASE_URL'});
  }

  return res.status(200).json({
    supabaseUrl,
    supabasePublishableKey,
    environment:process.env.VERCEL_ENV||'development'
  });
};
