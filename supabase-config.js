(function(root){
  root.TRUST_M_CONFIG_READY=(async function(){
    try{
      const response=await fetch('/api/config',{cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('CONFIG_HTTP_'+response.status);
      const data=await response.json();
      if(!data.supabaseUrl||!(data.supabasePublishableKey||data.supabaseAnonKey))throw new Error('CONFIG_INCOMPLETE');
      const config={url:data.supabaseUrl,anonKey:data.supabasePublishableKey||data.supabaseAnonKey,environment:data.environment||'production'};
      root.TRUST_M_SUPABASE=config;
      return config;
    }catch(error){
      console.info('Trust M runtime configuration is unavailable; local review mode may be used.',error.message);
      const config={url:'',anonKey:'',environment:'review',error:'CONFIG_UNAVAILABLE'};
      root.TRUST_M_SUPABASE=config;
      return config;
    }
  })();
})(globalThis);
