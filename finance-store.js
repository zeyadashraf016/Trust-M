(function(root){
  let opening;
  const localKey='trust-m-finance-demo-v2';
  const isLive=()=>Boolean(root.TrustAuth?.enabled&&root.TrustAuth?.client);
  const client=()=>root.TrustAuth?.client;

  async function waitForAuth(){
    if(root.TrustAuth?.ready)await root.TrustAuth.ready;
  }

  function openLocal(){
    return opening??=new Promise((resolve,reject)=>{
      const request=indexedDB.open('trust-m-finance-demo-v1',1);
      request.onupgradeneeded=()=>{
        for(const name of ['records','files']){
          if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  async function saveLocalFile(file){
    const connection=await openLocal();
    return new Promise((resolve,reject)=>{
      const tx=connection.transaction('files','readwrite');
      tx.objectStore('files').put(file.blob,file.id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('File save did not complete.'));
    });
  }

  async function deleteLocalFile(id){
    const connection=await openLocal();
    return new Promise((resolve,reject)=>{
      const tx=connection.transaction('files','readwrite');
      tx.objectStore('files').delete(id);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('File cleanup did not complete.'));
    });
  }

  async function localLoad(){
    const raw=localStorage.getItem(localKey);
    return raw?JSON.parse(raw):null;
  }

  async function localUpdate(mutate,file){
    const current=await localLoad();
    const next=current||structuredClone(root.TrustFinanceSeed);
    mutate(next);
    if(file)await saveLocalFile(file);
    try{
      localStorage.setItem(localKey,JSON.stringify(next));
    }catch(error){
      if(file)await deleteLocalFile(file.id).catch(()=>{});
      throw error;
    }
    return next;
  }

  async function remoteRow(){
    const {data,error}=await client().from('finance_workspaces').select('state, revision').eq('id','main').maybeSingle();
    if(error)throw error;
    return data;
  }

  async function remoteLoad(){
    const row=await remoteRow();
    return row?.state||null;
  }

  async function remoteUpdate(mutate,file){
    const sb=client();
    let uploaded=false;
    try{
      for(let attempt=0;attempt<3;attempt++){
        const row=await remoteRow();
        const next=structuredClone(row?.state||root.TrustFinanceSeed);
        mutate(next);
        if(file&&!uploaded){
          const {error:uploadError}=await sb.storage.from('trust-m-documents').upload(file.id,file.blob,{upsert:false});
          if(uploadError)throw uploadError;
          uploaded=true;
        }
        const {error}=await sb.rpc('save_finance_workspace',{p_state:next,p_expected_revision:Number(row?.revision||0)});
        if(!error)return next;
        if(error.code!=='40001')throw error;
        if(attempt===2)throw new Error('حد تاني حفظ تعديل قبلك. حدّث الصفحة وراجع الأرقام قبل ما تحفظ تاني.');
      }
    }catch(error){
      if(file&&uploaded)await sb.storage.from('trust-m-documents').remove([file.id]).catch(()=>{});
      throw error;
    }
  }

  async function localFile(id){
    const connection=await openLocal();
    return new Promise((resolve,reject)=>{
      const request=connection.transaction('files').objectStore('files').get(id);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  const store={
    get mode(){return isLive()?'supabase':'browser-demo';},
    async open(){await waitForAuth();return isLive()?null:openLocal();},
    async update(mutate,file){await waitForAuth();return isLive()?remoteUpdate(mutate,file):localUpdate(mutate,file);},
    async load(){await waitForAuth();return isLive()?remoteLoad():localLoad();},
    async getFile(id){
      await waitForAuth();
      if(!isLive())return localFile(id);
      const {data,error}=await client().storage.from('trust-m-documents').download(id);
      if(error)throw error;
      return data;
    }
  };
  root.TrustFinanceStore=store;
})(globalThis);
