(function(root){
 let opening;
 function open(){return opening??=new Promise((resolve,reject)=>{const r=indexedDB.open('trust-m-finance-demo-v1',1);r.onupgradeneeded=()=>{for(const name of ['records','files'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function update(mutate,file){const connection=await open();return new Promise((resolve,reject)=>{const tx=connection.transaction(file?['records','files']:['records'],'readwrite'),store=tx.objectStore('records'),request=store.get('workspace');let next;request.onsuccess=()=>{try{next=request.result||structuredClone(root.TrustFinanceSeed);if(root.TrustSourceData)root.TrustSourceImport.merge(next,root.TrustSourceData);mutate(next);store.put(next,'workspace');if(file)tx.objectStore('files').put(file.blob,file.id);}catch(e){reject(e);tx.abort();}};tx.oncomplete=()=>{resolve(next);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('الحفظ ما كملش.'));});}
 async function load(){const connection=await open();return new Promise((resolve,reject)=>{const r=connection.transaction('records').objectStore('records').get('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 root.TrustFinanceStore={open,update,load};
})(globalThis);
