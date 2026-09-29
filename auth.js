(function(){
  const cfg=window.TRUST_M_SUPABASE||{};
  const enabled=Boolean(cfg.url&&cfg.anonKey&&window.supabase);
  const roleRoutes={lamiaa_owner:'index.html',amr_partner:'amr.html',technician:'technician.html'};
  const pageRole=document.documentElement.dataset.requiredRole;
  const loginPage=/\/(login\.html|login)\/?$/.test(location.pathname);
  if(enabled)document.documentElement.dataset.authLive='true';
  const sb=enabled?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;

  function pathFor(file){return location.pathname.replace(/[^/]*$/,'')+file;}
  async function profileFor(userId){
    const {data,error}=await sb.from('profiles').select('id, full_name, role, is_active').eq('id',userId).single();
    if(error)throw error;
    if(!data||!data.is_active)throw new Error('ACCOUNT_INACTIVE');
    return data;
  }
  function reveal(profile){if(profile?.role)document.documentElement.dataset.userRole=profile.role;document.documentElement.classList.remove('auth-pending');}
  async function redirectForSession(){
    if(!enabled){const demo={role:pageRole||'demo',full_name:'مستخدم تجريبي',demo:true};reveal(demo);return demo;}
    const {data,error}=await sb.auth.getSession();if(error)throw error;
    const session=data?.session;
    if(!session){if(loginPage){reveal(null);return null;}location.replace(pathFor('login.html?reason=session'));return null;}
    const profile=await profileFor(session.user.id),route=roleRoutes[profile.role]||'login.html';
    if(loginPage||(pageRole&&profile.role!==pageRole)){location.replace(pathFor(route));return null;}
    reveal(profile);return profile;
  }
  const ready=redirectForSession().catch(async error=>{
    console.error('Trust M authentication failed:',error);
    if(sb)await sb.auth.signOut().catch(()=>{});
    if(loginPage){reveal(null);return null;}
    location.replace(pathFor('login.html?reason=access'));return null;
  });
  window.TrustAuth={
    enabled,roleRoutes,client:sb,ready,
    async signIn(email,password){
      if(!sb)throw new Error('NOT_CONFIGURED');
      const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
      const profile=await profileFor(data.user.id);
      location.replace(pathFor(roleRoutes[profile.role]||'login.html'));
    },
    async resetPassword(email){
      if(!sb)throw new Error('NOT_CONFIGURED');
      const redirectTo=new URL(pathFor('login.html'),location.origin).href;
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;
    },
    async signOut(){if(sb)await sb.auth.signOut();location.replace(pathFor('login.html'));},
    redirectForSession
  };
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-sign-out]').forEach(button=>button.addEventListener('click',()=>window.TrustAuth.signOut())));
})();
