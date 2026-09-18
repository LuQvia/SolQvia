(()=>{
  const detail=document.getElementById('p110Detail');
  if(!detail)return;
  const lang=document.documentElement.lang==='en'?'en':'ja';
  const t=(ja,en)=>lang==='en'?en:ja;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const load=u=>fetch(u).then(r=>r.ok?r.json():Promise.reject(new Error(u)));
  const rows=[
    ['esim_profile_configuration',t('eSIMプロファイル設定','eSIM profile configuration')],
    ['sim_information_recognition',t('端末側SIM情報認識','Device-side SIM information recognition')],
    ['sim_recognition',t('SIM認識（一般）','SIM recognition (general)')],
    ['mobile_data',t('データ通信','Mobile data')],
    ['voice_outgoing',t('音声発信','Voice outgoing')],
    ['voice_incoming',t('音声着信','Voice incoming')],
    ['voice',t('音声通話（方向未分離）','Voice call (direction not separated)')],
    ['sms_send',t('SMS送信','SMS send')],
    ['sms_receive',t('SMS受信','SMS receive')],
    ['sms',t('SMS（送受信未分離）','SMS (send/receive not separated)')],
    ['tethering',t('テザリング','Tethering')],
    ['fiveg_attach',t('5G実接続','5G attach')],
    ['volte_ims_registration',t('VoLTE / IMS登録','VoLTE / IMS registration')]
  ];
  const statusText={
    confirmed:t('確認済み','Confirmed'),
    not_tested:t('未検証','Not tested'),
    not_solqvia_tested:t('実動作未確認','Runtime unverified'),
    official_capability_only_not_solqvia_tested:t('公式機能あり／実動作未確認','Official capability / runtime unverified'),
    not_applicable:t('対象外','Not applicable'),
    not_applicable_physical_sim:t('物理SIM対象外','Physical SIM not applicable'),
    unverified:t('未確認','Unverified'),
    no_record:t('記録なし','No record')
  };
  const statusClass=v=>v==='confirmed'?'is-confirmed':v==='official_capability_only_not_solqvia_tested'?'is-official':v==='not_applicable'||v==='not_applicable_physical_sim'?'is-na':'is-unverified';
  const summarize=values=>{
    const v=values.filter(Boolean);
    if(!v.length)return'no_record';
    if(v.includes('confirmed'))return'confirmed';
    if(v.includes('official_capability_only_not_solqvia_tested'))return'official_capability_only_not_solqvia_tested';
    if(v.every(x=>x==='not_applicable'||x==='not_applicable_physical_sim'))return'not_applicable';
    if(v.includes('not_tested'))return'not_tested';
    if(v.includes('not_solqvia_tested'))return'not_solqvia_tested';
    return v[0]||'unverified';
  };
  let priority={priority_records:[]},realdb={records:[]},externaldb={records:[]};
  const findPriority=(name,number)=>priority.priority_records.find(x=>(x.model_number&&number&&norm(x.model_number)===norm(number))||norm(x.model_name)===norm(name));
  const findReal=(name,number)=>realdb.records.filter(x=>(x.model_number&&number&&norm(x.model_number)===norm(number))||norm(x.model_name)===norm(name));
  const findExternal=name=>externaldb.records.filter(x=>(x.model_names||[]).some(n=>norm(n)===norm(name)));
  const collectExternal=(records,key)=>{
    const out=[];
    for(const rec of records)for(const tests of Object.values(rec.results||{}))if(tests&&Object.prototype.hasOwnProperty.call(tests,key))out.push(tests[key]);
    return out;
  };
  const collectReal=(records,key)=>{
    const out=[];
    for(const rec of records)for(const tests of Object.values(rec.tests||{}))if(tests&&Object.prototype.hasOwnProperty.call(tests,key))out.push(tests[key]);
    return out;
  };
  const cell=(value,col)=>`<td data-col="${esc(col)}"><span class="p134-status ${statusClass(value)}">${esc(statusText[value]||String(value||statusText.unverified))}</span></td>`;
  function augment(){
    if(detail.dataset.p134Busy==='1')return;
    detail.dataset.p134Busy='1';
    try{
      const name=detail.querySelector('.p110-passport-head h2')?.textContent?.trim();
      const meta=detail.querySelector('.p110-passport-head p:not(.eyebrow)')?.textContent||'';
      const number=meta.split('/')[0].trim();
      if(!name)return;
      const signature=norm(name)+'|'+norm(number);
      if(detail.dataset.p134Record===signature&&detail.querySelector('[data-p134-added]'))return;
      detail.querySelectorAll('[data-p134-added]').forEach(n=>n.remove());
      detail.dataset.p134Record=signature;
      const ex=findPriority(name,number);
      const external=findExternal(name);
      const real=findReal(name,number);
      const body=rows.map(([key,label])=>{
        const official=ex?.runtime&&Object.prototype.hasOwnProperty.call(ex.runtime,key)?ex.runtime[key]:'no_record';
        const ext=summarize(collectExternal(external,key));
        const own=summarize(collectReal(real,key));
        return `<tr><th scope="row">${esc(label)}</th>${cell(official,t('仕様・公式','Specification / official'))}${cell(ext,t('外部実機','External field test'))}${cell(own,t('SolQvia実機','SolQvia real-device'))}</tr>`;
      }).join('');
      const section=`<section class="p110-section p134-layer" data-p134-added><div class="p134-head"><div><p class="eyebrow">Phase134 · Per-function Evidence Matrix</p><h3>${esc(t('機能ごとに「どの証拠で確認したか」を分離','Separate evidence for every runtime function'))}</h3></div><span class="p134-scope">${esc(t(`外郪実機 ${external.length}件 / SolQvia実機 ${real.length}件`,`${external.length} external / ${real.length} SolQvia real-device records`))}</span></div><p class="p110-state">${esc(t('音声通話・SMSのように元データが送受信を分離していない場合、発信・着信、送信・受信へ推測で展開しません。公式仕様、第三者の実機確認、SolQvia実機確認も別列で扱います。','When a source does not separate call direction or SMS send/receive, SolQvia does not infer those sub-results. Official capability, third-party field tests and SolQvia real-device evidence remain separate columns.'))}</p><div class="p134-table-wrap" tabindex="0" aria-label="${esc(t('機能別証拠マトリクス','Per-function evidence matrix'))}"><table class="p134-table"><thead><tr><th scope="col">${esc(t('機能','Function'))}</th><th scope="col">${esc(t('仕様・公式','Specification / official'))}</th><th scope="col">${esc(t('外部実機','External field test'))}</th><th scope="col">${esc(t('SolQvia実機','SolQvia real-device'))}</th></tr></thead><tbody>${body}</tbody></table></div><div class="p134-legend"><span><i class="is-confirmed"></i>${esc(t('確認済み','Confirmed'))}</span><span><i class="is-official"></i>${esc(t('公式機能あり／実動作未確認','Official capability / runtime unverified'))}</span><span><i class="is-unverified"></i>${esc(t('未確認・記録なし','Unverified / no record'))}</span></div></section>`;
      const p131=[...detail.querySelectorAll('[data-p131-added]')];
      const anchor=p131.length?p131[p131.length-1]:detail.querySelector('.p110-section');
      if(anchor)anchor.insertAdjacentHTML('afterend',section);
    }finally{
      detail.dataset.p134Busy='0';
    }
  }
  Promise.all([
    load('/assets/data/phase131-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase136-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase131-solqvia-real-device-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase132-external-field-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase135-external-field-evidence-v1.json').catch(()=>({records:[]}))
  ]).then(([p131,p136,r,e132,e135])=>{
    priority={priority_records:[...(p131.priority_records||[]),...(p136.priority_records||[])]};realdb=r;externaldb={records:[...(e132.records||[]),...(e135.records||[])]};
    augment();
    new MutationObserver(()=>augment()).observe(detail,{childList:true,subtree:false});
  });
})();
