(()=>{
  const detail=document.getElementById('p110Detail');
  if(!detail)return;
  const lang=document.documentElement.lang==='en'?'en':'ja';
  const t=(ja,en)=>lang==='en'?en:ja;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const label={device_listing:t('動作確認端末掲載','Tested-device listing'),
    physical_sim:t('物理SIM','Physical SIM'),physical_sim_slots:t('物理SIMスロット','Physical SIM slots'),physical_sim_supported:t('物理SIM対応','Physical SIM supported'),esim_supported:'eSIM',active_esim_count:t('同時有効eSIM','Active eSIMs'),stored_esim_count:t('保存可能eSIM','Stored eSIMs'),dual_esim:'Dual eSIM',dual_sim_ui:'Dual SIM UI',release_date:t('発売日','Release date'),manufacturer:t('メーカー','Manufacturer'),fiveg_supported:'5G',volte:'VoLTE',volte_hd_plus:'VoLTE HD+',tethering_supported:t('テザリング','Tethering'),lte_bands:'LTE Band',nr_bands:'5G NR Band',launch_os:t('発売時OS','Launch OS'),shipping_os:t('出荷時OS','Shipping OS'),docomo_listed_os:t('ドコモ掲載OS','Docomo-listed OS'),official_os_upgrade_plan:t('OS更新予定','OS upgrade plan'),security_update_plan:t('セキュリティ更新予定','Security update plan'),sim_recognition:t('SIM認識','SIM recognition'),mobile_data:t('データ通信','Mobile data'),voice_outgoing:t('音声発信','Voice outgoing'),voice_incoming:t('音声着信','Voice incoming'),sms_send:t('SMS送信','SMS send'),sms_receive:t('SMS受信','SMS receive'),tethering:t('テザリング','Tethering'),fiveg_attach:t('5G実接続','5G attach'),volte_ims_registration:t('VoLTE/IMS登録','VoLTE/IMS registration'),esim_profile_configuration:t('eSIMプロファイル設定','eSIM profile configuration'),sim_information_recognition:t('SIM情報認識','SIM information recognition'),apn:'APN',voice:t('音声通話','Voice'),sms:'SMS',guardian_features:t('見守り機能','Guardian features')
  };
  const fmt=v=>Array.isArray(v)?v.join(', '):typeof v==='boolean'?(v?t('対応','Supported'):t('非対応','Not supported')):(v&&typeof v==='object'?Object.entries(v).map(([k,x])=>`${label[k]||k}: ${fmt(x)}`).join(' / '):String(v??'—'));
  const status=v=>({confirmed:t('実機確認済み','Real-device confirmed'),not_tested:t('未検証','Not tested'),not_solqvia_tested:t('SolQvia実機未確認','Not tested by SolQvia'),not_applicable_physical_sim:t('物理SIM対象外','Physical SIM not applicable'),official_capability_only_not_solqvia_tested:t('公式機能あり／実動作未確認','Official capability / runtime unverified')})[v]||String(v||t('未確認','Unverified'));
  let priority={priority_records:[]},realdb={records:[]},externaldb={records:[]},coverage={metrics:[]},taxonomy={domains:[]};
  const load=u=>fetch(u).then(r=>r.ok?r.json():Promise.reject(new Error(u)));
  const findPriority=(name,number,carrierName)=>priority.priority_records.find(x=>(((x.model_number&&number&&norm(x.model_number)===norm(number))||norm(x.model_name)===norm(name))&&(!x.original_carrier||norm(x.original_carrier)===norm(carrierName))))||priority.priority_records.find(x=>(x.model_number&&number&&norm(x.model_number)===norm(number))||norm(x.model_name)===norm(name));
  const findReal=(name,number)=>realdb.records.filter(x=>(x.model_number&&number&&norm(x.model_number)===norm(number))||norm(x.model_name)===norm(name));
  const findExternal=(name,number)=>externaldb.records.filter(x=>(x.model_names||[]).some(n=>norm(n)===norm(name))&&(!(x.model_numbers||[]).length||(x.model_numbers||[]).some(n=>norm(n)===norm(number))));
  const objGrid=obj=>obj?Object.entries(obj).filter(([,v])=>v!==null&&v!==undefined).map(([k,v])=>`<div><b>${esc(label[k]||k.replaceAll('_',' '))}</b><span>${esc(fmt(v))}</span></div>`).join(''):'';
  function runtime(ex){if(!ex?.runtime)return'';return `<div class="p131-runtime">${Object.entries(ex.runtime).map(([k,v])=>`<div><b>${esc(label[k]||k)}</b><span>${esc(status(v))}</span></div>`).join('')}</div>`}
  function externalHtml(records){return records.map(rec=>`<div class="p131-real-wrap"><p><strong>${esc(rec.source_name||t('外部動作確認','External field test'))}</strong> · ${esc(rec.tested_at||'—')} · ${esc(rec.device_variant||'—')}</p><div class="p131-test-grid">${Object.entries(rec.results||{}).map(([simType,tests])=>`<section class="p131-test-card"><h4>${esc(simType)}</h4><dl>${Object.entries(tests).map(([k,v])=>`<div><dt>${esc(label[k]||k)}</dt><dd class="${v==='confirmed'?'is-confirmed':''}">${esc(status(v))}</dd></div>`).join('')}</dl></section>`).join('')}</div>${(rec.notes||[]).length?`<ul class="p110-gaps">${rec.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}<p><a href="${esc(rec.source_url)}" target="_blank" rel="noopener">${esc(t('外部動作確認の一次掲載元','External test source'))}</a></p></div>`).join('')}
  function realHtml(records){return records.map(rec=>`<div class="p131-real-wrap"><p><strong>${esc(t('確認日','Test date'))}:</strong> ${esc(rec.tested_at||'—')}</p><div class="p131-test-grid">${Object.entries(rec.tests||{}).map(([carrierName,tests])=>`<section class="p131-test-card"><h4>${esc(carrierName)}</h4><dl>${Object.entries(tests).map(([k,v])=>`<div><dt>${esc(label[k]||k)}</dt><dd class="${v==='confirmed'?'is-confirmed':''}">${esc(status(v))}</dd></div>`).join('')}</dl></section>`).join('')}</div><p class="p110-state">${esc(rec.scope_note||'')}</p></div>`).join('')}
  function augment(){
    if(detail.dataset.p131Busy==='1')return;
    detail.dataset.p131Busy='1';
    try{
      const name=detail.querySelector('.p110-passport-head h2')?.textContent?.trim();
      const meta=detail.querySelector('.p110-passport-head p:not(.eyebrow)')?.textContent||'';
      const partsMeta=meta.split('/');const number=partsMeta[0].trim();const carrierName=partsMeta.slice(1).join('/').trim();
      if(!name)return;
      const signature=norm(name)+'|'+norm(number);
      if(detail.dataset.p131Record===signature&&detail.querySelector('[data-p131-added]'))return;
      detail.querySelectorAll('[data-p131-added]').forEach(n=>n.remove());
      detail.dataset.p131Record=signature;
      const ex=findPriority(name,number,carrierName);const real=findReal(name,number);const external=findExternal(name,number);
      const firstSection=detail.querySelector('.p110-section');
      if(!firstSection)return;
      const parts=[];
      if(ex||real.length||external.length){
        parts.push(`<section class="p110-section p131-layer" data-p131-added><h3>${esc(t('証拠レベル','Evidence levels'))}</h3><div class="p131-evidence-grid"><div class="${real.length?'is-ok':''}"><b>${esc(t('SolQvia実機確認','SolQvia real-device'))}</b><span>${esc(real.length?t('あり（確認範囲のみ）','Available for tested scope'):t('なし','None'))}</span></div><div class="${ex?'is-ok':''}"><b>${esc(t('公式確認','Official sources'))}</b><span>${esc(ex?t('型番別詳細あり','Exact-model detail available'):t('既存DBを参照','Use base dataset'))}</span></div><div class="${external.length?'is-ok':''}"><b>${esc(t('外部動作確認','External field tests'))}</b><span>${esc(external.length?t('第三者実機結果あり','Third-party field results available'):t('SolQvia実機と分離','Kept separate'))}</span></div><div><b>${esc(t('未確認','Unverified'))}</b><span>${esc(t('推測で埋めない','Never filled by inference'))}</span></div></div></section>`);
      }
      if(ex){
        parts.push(`<section class="p110-section p131-layer" data-p131-added><h3>${esc(t('追加公式詳細データ','Additional official detail'))}</h3><div class="p110-kv">${objGrid(ex.identity)}${objGrid(ex.sim_esim)}${objGrid(ex.network)}${objGrid(ex.software)}</div><p class="p110-state">${esc(t('公式仕様は実際の通信成功を意味しません。SIM認識・データ・通話・SMS・5G・VoLTE/IMSは別々に確認します。','Official capability does not prove runtime success. SIM recognition, data, voice, SMS, 5G and VoLTE/IMS are evaluated separately.'))}</p><h4>${esc(t('実動作マトリクス','Runtime matrix'))}</h4>${runtime(ex)}<details class="p131-source-details"><summary>${esc(t('追加根拠URL','Additional evidence URLs'))}</summary><ul>${(ex.sources||[]).map(u=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a></li>`).join('')}</ul></details></section>`);
      }
      if(external.length){
        parts.push(`<section class="p110-section p131-layer" data-p131-added><h3>${esc(t('外部動作確認','External field-test evidence'))}</h3><p class="p110-state">${esc(t('IIJmio等の第三者が独自に確認した結果です。SolQvia実機確認とは別証拠として表示します。','These are independent third-party results such as IIJmio tests. They are not SolQvia real-device evidence.'))}</p>${externalHtml(external)}</section>`);
      }
      if(real.length){
        parts.push(`<section class="p110-section p131-layer" data-p131-added><h3>${esc(t('SolQvia実機確認','SolQvia real-device evidence'))}</h3>${realHtml(real)}</section>`);
      }
      if(parts.length)firstSection.insertAdjacentHTML('afterend',parts.join(''));
    }finally{detail.dataset.p131Busy='0'}
  }
  function foundation(){
    const d=document.getElementById('p130Domains');
    if(d&&taxonomy.domains?.length)d.innerHTML=taxonomy.domains.map(x=>`<span>${esc(lang==='en'?x.id.replaceAll('_',' '):x.label_ja)}</span>`).join('');
    const c=document.getElementById('p130Coverage');
    if(c&&coverage.metrics?.length)c.innerHTML=coverage.metrics.map(m=>`<div class="p130-meter-item"><div><b>${esc(lang==='en'?m.id.replaceAll('_',' '):m.label_ja)}</b><span>${esc(`${m.known}/${m.total} (${m.coverage_pct}%)`)}</span></div><div class="p130-meter"><i style="width:${Math.max(0,Math.min(100,m.coverage_pct))}%"></i></div></div>`).join('');
  }
  Promise.all([
    load('/assets/data/phase131-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase136-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase137-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase138-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase139-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase131-solqvia-real-device-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase132-external-field-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase135-external-field-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase137-external-field-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase138-external-field-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase139-external-field-evidence-v1.json').catch(()=>({records:[]})),
    load('/assets/data/phase138-coverage-gap-audit-v1.json').catch(()=>load('/assets/data/phase137-coverage-gap-audit-v1.json')).catch(()=>load('/assets/data/phase136-coverage-gap-audit-v1.json')).catch(()=>load('/assets/data/phase135-coverage-gap-audit-v1.json')).catch(()=>load('/assets/data/phase133-coverage-gap-audit-v1.json')).catch(()=>load('/assets/data/phase132-coverage-gap-audit-v1.json')).catch(()=>load('/assets/data/phase130-coverage-gap-audit-v1.json')).catch(()=>({metrics:[]})),
    load('/assets/data/phase130-unified-capability-taxonomy-v1.json').catch(()=>({domains:[]}))
  ]).then(([p131,p136,p137,p138,p139,r,ext132,ext135,ext137,ext138,ext139,c,tax])=>{priority={priority_records:[...(p131.priority_records||[]),...(p136.priority_records||[]),...(p137.priority_records||[]),...(p138.priority_records||[]),...(p139.priority_records||[])]};realdb=r;externaldb={records:[...(ext132.records||[]),...(ext135.records||[]),...(ext137.records||[]),...(ext138.records||[]),...(ext139.records||[])]};coverage=c;taxonomy=tax;foundation();augment();new MutationObserver(()=>augment()).observe(detail,{childList:true,subtree:false})});
})();