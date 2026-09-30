(function(){
  const roleRoutes={lamiaa_owner:'index.html',amr_partner:'amr.html',technician:'technician.html',client:'client.html'};
  const pageRole=document.documentElement.dataset.requiredRole;
  const loginPage=/\/(login\.html|login)\/?$/.test(location.pathname);
  const localReview=['localhost','127.0.0.1',''].includes(location.hostname)||location.protocol==='file:';
  let sb=null,bootstrapPromise=null;

  const api={
    enabled:false,
    roleRoutes,
    client:null,
    configError:null,
    ready:null,
    async signIn(email,password){
      await bootstrap();
      if(!sb)throw new Error(api.configError?'CONFIG_UNAVAILABLE':'NOT_CONFIGURED');
      await sb.auth.signOut({scope:'local'}).catch(()=>{});
      const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
      const profile=await profileFor(data.user.id);
      location.replace(pathFor(roleRoutes[profile.role]||'login.html'));
    },
    async resetPassword(email){
      await bootstrap();
      if(!sb)throw new Error(api.configError?'CONFIG_UNAVAILABLE':'NOT_CONFIGURED');
      const redirectTo=new URL(pathFor('login.html'),location.origin).href;
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;
    },
    async signOut(){
      await bootstrap();
      if(sb)await sb.auth.signOut();
      location.replace(pathFor('login.html'));
    },
    redirectForSession
  };
  window.TrustAuth=api;

  function pathFor(file){return location.pathname.replace(/[^/]*$/,'')+file;}

  async function bootstrap(){
    if(bootstrapPromise)return bootstrapPromise;
    bootstrapPromise=(async()=>{
      const cfg=await (window.TRUST_M_CONFIG_READY||Promise.resolve(window.TRUST_M_SUPABASE||{}));
      api.configError=cfg?.error||null;
      api.enabled=Boolean(cfg?.url&&cfg?.anonKey&&window.supabase);
      if(api.enabled){
        document.documentElement.dataset.authLive='true';
        sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        api.client=sb;
      }
      return cfg;
    })();
    return bootstrapPromise;
  }

  async function profileFor(userId){
    await bootstrap();
    const {data,error}=await sb.from('profiles').select('id, full_name, role, is_active').eq('id',userId).single();
    if(error)throw error;
    if(!data||!data.is_active)throw new Error('ACCOUNT_INACTIVE');
    return data;
  }

  function reveal(profile){
    if(profile?.role)document.documentElement.dataset.userRole=profile.role;
    document.documentElement.classList.remove('auth-pending');
  }

  async function redirectForSession(){
    await bootstrap();
    if(!api.enabled){
      if(api.configError&&!localReview){
        if(loginPage){reveal(null);return null;}
        location.replace(pathFor('login.html?reason=config'));return null;
      }
      const demo={role:pageRole||'demo',full_name:'مستخدم تجريبي',demo:true};
      reveal(demo);return demo;
    }
    const {data,error}=await sb.auth.getSession();if(error)throw error;
    const session=data?.session;
    if(!session){
      if(loginPage){reveal(null);return null;}
      location.replace(pathFor('login.html?reason=session'));return null;
    }
    const profile=await profileFor(session.user.id),route=roleRoutes[profile.role]||'login.html';
    if(loginPage){reveal(profile);return profile;}
    if(pageRole&&profile.role!==pageRole){location.replace(pathFor(route));return null;}
    reveal(profile);return profile;
  }

  api.ready=redirectForSession().catch(async error=>{
    console.error('Trust M authentication failed:',error);
    if(sb)await sb.auth.signOut().catch(()=>{});
    if(loginPage){reveal(null);return null;}
    location.replace(pathFor('login.html?reason=access'));return null;
  });

  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-sign-out]').forEach(button=>button.addEventListener('click',()=>api.signOut())));
})();
