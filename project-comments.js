(function(root){
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));

  async function mount(container,projectId,options={}){
    if(!container)return;
    if(!root.TrustAuth.enabled){
      container.innerHTML='<div class="empty-state compact"><p>التعليقات هتظهر هنا بعد توصيل قاعدة البيانات.</p></div>';
      return;
    }
    container.innerHTML='<p class="subtle">بنفتح تعليقات المشروع…</p>';
    const canPost=options.canPost!==false;
    try{
      const {data,error}=await root.TrustAuth.client.from('project_comments')
        .select('id,body,is_flag,created_at,profiles!project_comments_author_id_fkey(full_name)')
        .eq('project_id',projectId).order('created_at',{ascending:false});
      if(error)throw error;
      draw(container,projectId,data||[],canPost);
    }catch(error){
      console.error(error);
      container.innerHTML='<div class="empty-state compact"><p>مش قادرين نفتح التعليقات دلوقتي.</p></div>';
    }
  }

  function draw(container,projectId,comments,canPost){
    container.innerHTML='<div class="project-comments-list">'+(comments.length?comments.map(comment=>'<article class="project-comment '+(comment.is_flag?'flagged':'')+'"><div><strong>'+esc(comment.profiles?.full_name||'فريق Trust M')+'</strong>'+(comment.is_flag?'<span>محتاج متابعة</span>':'')+'</div><p>'+esc(comment.body)+'</p><small>'+esc(formatDate(comment.created_at))+'</small></article>').join(''):'<div class="empty-state compact"><p>لسه مفيش تعليقات على المشروع.</p></div>')+'</div>'+(canPost?'<form class="project-comment-form"><label>تعليق جديد<textarea name="body" maxlength="1000" rows="3" required placeholder="اكتب الملاحظة أو المطلوب متابعته"></textarea></label><label class="comment-flag"><input type="checkbox" name="flag"> علّمها كملاحظة محتاجة متابعة</label><div class="form-actions"><button class="gold-button" type="submit">ضيف التعليق</button></div><p class="form-error" role="alert"></p></form>':'');
    const form=container.querySelector('form');
    if(!form)return;
    form.onsubmit=async event=>{
      event.preventDefault();
      const button=event.submitter,errorBox=form.querySelector('.form-error');
      button.disabled=true;errorBox.textContent='';
      try{
        const fields=new FormData(form),body=String(fields.get('body')||'').trim();
        if(!body)throw Error('اكتب التعليق الأول.');
        const {error}=await root.TrustAuth.client.from('project_comments').insert({project_id:projectId,author_id:root.TrustAuth.profile.id,body,is_flag:fields.get('flag')==='on'});
        if(error)throw error;
        await mount(container,projectId,{canPost});
      }catch(error){
        console.error(error);errorBox.textContent='التعليق ما اتحفظش. راجع الصلاحيات وجرّب تاني.';
      }finally{if(button.isConnected)button.disabled=false;}
    };
  }
  root.TrustProjectComments={mount};
})(globalThis);
