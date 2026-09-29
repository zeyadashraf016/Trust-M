(function(){
  const form=document.querySelector('#login-form'),status=document.querySelector('#login-status'),session=document.querySelector('#session-message');
  const messages={NOT_CONFIGURED:'نسخة المراجعة مش متوصلة بقاعدة البيانات لسه.',ACCOUNT_INACTIVE:'الحساب ده متوقف. تواصل مع لمياء.','Invalid login credentials':'البريد الإلكتروني أو كلمة المرور مش صحيحة.','Email not confirmed':'أكد البريد الإلكتروني الأول، وبعدها جرّب تاني.'};
  const friendly=error=>messages[error?.message]||'تعذر تسجيل الدخول دلوقتي. جرّب تاني بعد شوية.';
  const reason=new URLSearchParams(location.search).get('reason');
  if(reason){session.hidden=false;session.textContent=reason==='session'?'الجلسة انتهت. سجل دخولك تاني عشان تكمل.':'الحساب ده مش مسموح له يفتح الصفحة المطلوبة.';}
  document.querySelector('#toggle-password').onclick=event=>{const input=document.querySelector('#password'),show=input.type==='password';input.type=show?'text':'password';event.currentTarget.textContent=show?'إخفاء':'إظهار';event.currentTarget.setAttribute('aria-pressed',String(show));};
  form.onsubmit=async event=>{event.preventDefault();status.hidden=true;const button=event.submitter;button.disabled=true;const data=new FormData(form);try{await window.TrustAuth.signIn(String(data.get('email')).trim(),String(data.get('password')));}catch(error){status.textContent=friendly(error);status.hidden=false;button.disabled=false;}};
  document.querySelector('#forgot-password').onclick=async()=>{const email=String(new FormData(form).get('email')).trim();if(!email){status.textContent='اكتب بريدك الإلكتروني الأول.';status.hidden=false;form.elements.email.focus();return;}try{await window.TrustAuth.resetPassword(email);status.textContent='بعتنا رابط تغيير كلمة المرور لو البريد مسجل عندنا.';status.hidden=false;}catch(error){status.textContent=friendly(error);status.hidden=false;}};
})();
