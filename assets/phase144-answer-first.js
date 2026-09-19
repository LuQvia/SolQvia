(()=>{
  const detail=document.getElementById('p110Detail');
  if(!detail)return;

  const lang=document.documentElement.lang==='en'?'en':'ja';
  const t=(ja,en)=>lang==='en'?en:ja;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const load=u=>fetch(u).then(r=>r.ok?r.json():Promise.reject(new Error(u)));

  let priority={priority_records:[]};

  const findPriority=(name,number,carrierName)=>
    priority.priority_records.find(x=>(
      ((x.model_number&&number&&norm(x.model_number)===norm(number))||norm(x.model_name)===norm(name))&&
      (!x.original_carrier||norm(x.original_carrier)===norm(carrierName))
    ))||
    priority.priority_records.find(x=>(x.model_number&&number&&norm(x.model_number)===norm(number)));

  const readKv=(ja,en)=>{
    const target=norm(t(ja,en));
    for(const row of detail.querySelectorAll('.p110-kv>div')){
      const key=norm(row.querySelector('b')?.textContent);
      if(key===target)return row.querySelector('span')?.textContent?.trim()||'';
    }
    return '';
  };

  const result=(tone,label,detailText)=>({tone,label,detail:detailText||''});

  function runtime(ex,keys,{capabilityKey,capabilityLabel}={}){
    const vals=keys.map(k=>ex?.runtime?.[k]).filter(Boolean);
    if(vals.includes('confirmed'))return result('confirmed',t('確認記録あり','Confirmation recorded'),t('根拠種別は下の証拠マトリクスで確認','See evidence matrix below for source type'));
    if(vals.includes('not_supported'))return result('negative',t('非対応・失敗記録','Not supported / failed'),t('確認条件は下の詳細を参照','See conditions below'));
    if(vals.length&&vals.every(v=>v==='not_applicable'||v==='not_applicable_physical_sim'))return result('neutral',t('対象外','Not applicable'),'');
    if(vals.includes('official_capability_only_not_solqvia_tested'))return result('official',t('公式仕様あり','Official capability'),t('実動作までは未確認','Runtime not yet confirmed'));
    if(capabilityKey&&ex?.network?.[capabilityKey]===true)return result('official',capabilityLabel||t('対応仕様あり','Supported by specification'),t('実動作までは未確認','Runtime not yet confirmed'));
    return result('unverified',t('未確認','Unverified'),t('使えないという意味ではありません','This does not mean unsupported'));
  }

  function dualState(ex){
    if(ex?.sim_esim?.dual_esim===true)return result('official',t('Dual eSIM構成あり','Dual eSIM configuration recorded'),ex.sim_esim.dual_sim_ui||'');
    const ui=String(ex?.sim_esim?.dual_sim_ui||'');
    if(ui&& !/unverified|未確認/i.test(ui))return result('official',t('Dual SIM構成あり','Dual SIM configuration recorded'),ui);
    return result('unverified',t('同時利用は未確認','Simultaneous use unverified'),ui||t('型番別の一次情報を確認','Check exact-model primary evidence'));
  }

  function evidenceState(ex){
    const badges=[...detail.querySelectorAll('.p110-badges .p110-badge')].map(x=>x.textContent.trim());
    const hasReal=badges.some(x=>/実機確認あり|real-device evidence/i.test(x)&&!/なし|no real-device/i.test(x));
    if(hasReal)return result('confirmed',t('SolQvia実機あり','SolQvia real-device evidence'),t('確認した機能だけを有効な証拠として扱います','Only observed functions are treated as confirmed'));
    if(ex)return result('official',t('型番別の追加根拠あり','Exact-model evidence available'),t('公式仕様と実動作は分離表示','Specification and runtime evidence stay separate'));
    return result('neutral',t('登録根拠を確認','Check registered evidence'),t('下の一次情報・証拠を参照','See primary sources below'));
  }

  function simState(){
    const sim=readKv('SIM / eSIM','SIM / eSIM');
    if(!sim||sim==='—'||/周波数表では確認不可|個別機種の公式仕様ページで最終確認/i.test(sim)){
      return result('unverified',t('構成未確認','Configuration unverified'),sim||t('型番別確認が必要','Exact-model check required'));
    }
    return result('official',t('構成記録あり','Configuration recorded'),sim);
  }

  function card(label,state){
    return `<div class="p144-answer-card is-${esc(state.tone)}"><span class="p144-answer-label">${esc(label)}</span><strong>${esc(state.label)}</strong>${state.detail?`<small>${esc(state.detail)}</small>`:''}</div>`;
  }

  function actions(){
    const links=[...detail.querySelectorAll('.p110-tools a')];
    const defs=[
      ['sim-esim-compatibility-diagnosis',t('SIM/eSIMを詳しく確認','Check SIM/eSIM details')],
      ['communication-compatibility-lab',t('通話・SMSを詳しく確認','Check voice/SMS details')],
      ['dual-sim-esim-combination-diagnosis',t('Dual SIMを詳しく確認','Check Dual SIM details')]
    ];
    const out=[];
    for(const [needle,label] of defs){
      const a=links.find(x=>(x.getAttribute('href')||'').includes(needle));
      if(a)out.push(`<a href="${esc(a.getAttribute('href'))}">${esc(label)} →</a>`);
    }
    return out.join('');
  }

  function augment(){
    if(detail.dataset.p144Busy==='1')return;
    detail.dataset.p144Busy='1';
    try{
      const head=detail.querySelector('.p110-passport-head');
      const name=head?.querySelector('h2')?.textContent?.trim();
      const meta=head?.querySelector('p:not(.eyebrow)')?.textContent||'';
      if(!head||!name)return;

      const parts=meta.split('/');
      const number=parts[0].trim();
      const carrierName=parts.slice(1).join('/').trim();
      const signature=norm(name)+'|'+norm(number)+'|'+norm(carrierName);

      if(detail.dataset.p144Record===signature&&detail.querySelector('[data-p144-answer]'))return;
      detail.querySelectorAll('[data-p144-answer]').forEach(n=>n.remove());
      detail.dataset.p144Record=signature;

      const ex=findPriority(name,number,carrierName);
      const sim=simState();
      const data=runtime(ex,['mobile_data']);
      const voice=runtime(ex,['voice','voice_outgoing','voice_incoming']);
      const sms=runtime(ex,['sms','sms_send','sms_receive']);
      const tether=runtime(ex,['tethering'],{capabilityKey:'tethering_supported',capabilityLabel:t('テザリング対応仕様','Tethering supported by specification')});
      const fiveg=runtime(ex,['fiveg_attach','fiveg_sa'],{capabilityKey:'fiveg_supported',capabilityLabel:t('5G対応仕様','5G supported by specification')});
      const dual=dualState(ex);
      const evidence=evidenceState(ex);

      const html=`<section class="p144-answer-first" data-p144-answer aria-labelledby="p144-answer-title">
        <div class="p144-answer-head">
          <div>
            <p class="eyebrow">Phase144 · Answer First</p>
            <h3 id="p144-answer-title">${esc(t('まず結論：この型番で確認できていること','Answer first: what is currently known for this exact model'))}</h3>
            <p>${esc(t('「対応」と「実際に動いた」を混ぜず、確認できた範囲だけを先に表示します。','Capability and observed runtime are kept separate; only currently supported evidence is summarized here.'))}</p>
          </div>
          <span class="p144-model-chip">${esc([number,carrierName].filter(Boolean).join(' / ')||name)}</span>
        </div>
        <div class="p144-answer-grid">
          ${card('SIM / eSIM',sim)}
          ${card(t('データ通信','Mobile data'),data)}
          ${card(t('音声通話','Voice'),voice)}
          ${card('SMS',sms)}
          ${card(t('テザリング','Tethering'),tether)}
          ${card('5G',fiveg)}
          ${card('Dual SIM',dual)}
          ${card(t('証拠レベル','Evidence'),evidence)}
        </div>
        <div class="p144-answer-foot">
          <p><strong>${esc(t('未確認 = 使えない、ではありません。','Unverified does not mean unsupported.'))}</strong> ${esc(t('回線・OS・SIM種別・契約条件で結果が変わるため、未確認項目は推測で○にしません。','Results can vary by carrier, OS, SIM type and account conditions, so unverified items are never promoted by inference.'))}</p>
          <div class="p144-answer-actions">${actions()}</div>
        </div>
      </section>`;

      head.insertAdjacentHTML('afterend',html);
    }finally{
      detail.dataset.p144Busy='0';
    }
  }

  Promise.all([
    load('/assets/data/phase131-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase136-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase137-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase138-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase139-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase140-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase141-priority-enrichment-v1.json').catch(()=>({priority_records:[]})),
    load('/assets/data/phase143-priority-enrichment-v1.json').catch(()=>({priority_records:[]}))
  ]).then(parts=>{
    priority={priority_records:parts.flatMap(x=>x.priority_records||[])};
    augment();
    new MutationObserver(()=>augment()).observe(detail,{childList:true,subtree:false});
  });
})();