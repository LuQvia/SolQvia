(()=>{
  const lang=document.documentElement.lang==='en'?'en':'ja';
  const t=(ja,en)=>lang==='en'?en:ja;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const load=u=>fetch(u).then(r=>r.ok?r.json():Promise.reject(new Error(u)));
  const flatten=xs=>xs.flatMap(x=>Array.isArray(x?.records)?x.records:Array.isArray(x?.priority_records)?x.priority_records:[]);
  const ok=v=>['confirmed','confirmed_ok','working','ok','supported'].includes(norm(v));
  const failed=v=>['confirmed_fail','failed','not_supported','not_working'].includes(norm(v));

  Promise.all([
    load('/assets/data/phase176-evidence-moat-config-v1.json'),
  ]).then(async([cfg])=>{
    const fetchMany=async urls=>Promise.all(urls.map(u=>load(u).catch(()=>({records:[],priority_records:[]}))));
    const [realSets,externalSets,officialSets]=await Promise.all([
      fetchMany(cfg.data_sources.solqvia_real_device),
      fetchMany(cfg.data_sources.external_field),
      fetchMany(cfg.data_sources.official_runtime)
    ]);
    const real=flatten(realSets), external=flatten(externalSets), official=flatten(officialSets);

    const aliases=f=>new Set(f.aliases||[f.id]);
    const collectTests=(records,name,number,carrier,kind)=>{
      const out=[];
      for(const r of records){
        let match=false;
        if(kind==='real'){
          match=(r.model_number&&number&&norm(r.model_number)===norm(number))||norm(r.model_name)===norm(name);
        }else if(kind==='external'){
          const names=r.model_names||[]; const nums=r.model_numbers||[];
          match=(nums.length&&number&&nums.some(x=>norm(x)===norm(number)))||(!nums.length&&names.some(x=>norm(x)===norm(name)));
        }else{
          match=((r.model_number&&number&&norm(r.model_number)===norm(number))||norm(r.model_name)===norm(name));
          if(match&&r.original_carrier&&carrier)match=norm(r.original_carrier)===norm(carrier)||match;
        }
        if(match)out.push(r);
      }
      return out;
    };
    const valuesFor=(records,f,kind)=>{
      const keys=aliases(f),vals=[];
      for(const r of records){
        if(kind==='real'){
          for(const tests of Object.values(r.tests||{}))for(const [k,v] of Object.entries(tests||{}))if(keys.has(k))vals.push(v);
        }else if(kind==='external'){
          for(const tests of Object.values(r.results||{}))for(const [k,v] of Object.entries(tests||{}))if(keys.has(k))vals.push(v);
        }else{
          for(const [k,v] of Object.entries(r.runtime||{}))if(keys.has(k))vals.push(v);
        }
      }
      return vals;
    };
    const stateFor=(vals,kind)=>{
      if(vals.some(ok))return kind==='real'?'own':kind==='external'?'external':'official';
      if(vals.some(failed))return kind==='real'?'own-fail':kind==='external'?'external-fail':'official-fail';
      return 'unknown';
    };
    const stateLabel=s=>({
      own:t('実機確認済み','Real-device confirmed'),
      'own-fail':t('実機で非動作確認','Failed in SolQvia test'),
      external:t('外部実機確認','External field confirmed'),
      'external-fail':t('外部実機で非動作','External field failure'),
      official:t('公式・仕様あり','Official / spec available'),
      'official-fail':t('公式上の非対応等','Officially unsupported / limited'),
      unknown:t('未確認','Unverified')
    })[s]||s;

    function status(records,f,kind){return stateFor(valuesFor(records,f,kind),kind)}
    function passport(){
      const detail=document.getElementById('p110Detail'); if(!detail)return;
      const render=()=>{
        const h=detail.querySelector('.p110-passport-head h2'); if(!h)return;
        const name=h.textContent.trim();
        const meta=detail.querySelector('.p110-passport-head p:not(.eyebrow)')?.textContent||'';
        const parts=meta.split('/'); const number=(parts[0]||'').trim(); const carrier=parts.slice(1).join('/').trim();
        const sig=norm(name)+'|'+norm(number)+'|'+norm(carrier);
        if(detail.dataset.p176Record===sig&&detail.querySelector('[data-p176-added]'))return;
        detail.querySelectorAll('[data-p176-added]').forEach(n=>n.remove());
        detail.dataset.p176Record=sig;

        const ownRecords=collectTests(real,name,number,carrier,'real');
        const extRecords=collectTests(external,name,number,carrier,'external');
        const offRecords=collectTests(official,name,number,carrier,'official');

        const rows=cfg.functions.map(f=>{
          const own=status(ownRecords,f,'real'), ext=status(extRecords,f,'external'), off=status(offRecords,f,'official');
          return {f,own,ext,off};
        });
        const ownConfirmed=rows.filter(r=>r.own==='own'||r.own==='own-fail').length;
        const extConfirmed=rows.filter(r=>r.ext==='external'||r.ext==='external-fail').length;
        const offKnown=rows.filter(r=>r.off!=='unknown').length;
        const completelyUnknown=rows.filter(r=>r.own==='unknown'&&r.ext==='unknown'&&r.off==='unknown').length;
        const next=rows.filter(r=>r.own==='unknown').sort((a,b)=>a.f.priority-b.f.priority).slice(0,5);

        const table=rows.map(r=>`<tr><th scope="row">${esc(lang==='en'?r.f.en:r.f.ja)}</th><td><span class="p176-state" data-state="${esc(r.own)}">${esc(stateLabel(r.own))}</span></td><td><span class="p176-state" data-state="${esc(r.ext)}">${esc(stateLabel(r.ext))}</span></td><td><span class="p176-state" data-state="${esc(r.off)}">${esc(stateLabel(r.off))}</span></td></tr>`).join('');
        const nextHtml=next.length?next.map(r=>{
          const support=r.ext!=='unknown'?t('外部実機根拠あり','External field evidence exists'):r.off!=='unknown'?t('公式・仕様根拠あり','Official/spec evidence exists'):t('他根拠も未確認','No supporting runtime evidence');
          return `<li><strong>${esc(lang==='en'?r.f.en:r.f.ja)}</strong> — ${esc(support)}</li>`;
        }).join(''):`<li>${esc(t('12機能すべてにSolQvia実機記録があります。','All 12 functions have SolQvia real-device records.'))}</li>`;

        const html=`<section class="p110-section p176-moat" data-p176-added>
          <div class="p176-moat-head"><div><p class="eyebrow">Phase176 · Evidence Moat</p><h3>${esc(t('実機証拠の充足状況と、次に確認すべき項目','Real-device evidence coverage and next verification gaps'))}</h3><p>${esc(t('「未確認」は非対応ではありません。公式仕様・外部実機・SolQvia実機を混ぜず、機能ごとに確認範囲を表示します。','Unverified does not mean unsupported. Official/specification data, external field tests and SolQvia real-device results remain separate by function.'))}</p></div><span class="p176-badge">${esc(t('総合スコア化しない','No mixed-evidence score'))}</span></div>
          <div class="p176-stats"><div class="p176-stat"><b>${ownConfirmed}/12</b><span>${esc(t('SolQvia実機','SolQvia real-device'))}</span></div><div class="p176-stat"><b>${extConfirmed}/12</b><span>${esc(t('外部実機','External field'))}</span></div><div class="p176-stat"><b>${offKnown}/12</b><span>${esc(t('公式・仕様','Official / spec'))}</span></div><div class="p176-stat"><b>${completelyUnknown}/12</b><span>${esc(t('全根拠で未確認','Unknown in all classes'))}</span></div></div>
          <div class="p176-table-wrap" tabindex="0"><table class="p176-table"><thead><tr><th>${esc(t('機能','Function'))}</th><th>${esc(t('SolQvia実機','SolQvia real-device'))}</th><th>${esc(t('外部実機','External field'))}</th><th>${esc(t('公式・仕様','Official / spec'))}</th></tr></thead><tbody>${table}</tbody></table></div>
          <div class="p176-next"><strong>${esc(t('次の実機検証優先項目','Next SolQvia real-device verification priorities'))}</strong><ol>${nextHtml}</ol></div>
          <p class="p176-boundary"><strong>${esc(t('判定境界','Claim boundary'))}</strong>${esc(t('SIM/eSIM認識だけでデータ通信・通話・SMS・OTP・5G・VoLTE/IMSを「利用可能」とは扱いません。通話の一括結果から発信/着信、SMSの一括結果から送信/受信へも推測展開しません。','SIM/eSIM recognition alone never proves data, voice, SMS, OTP, 5G or VoLTE/IMS. Aggregate voice or SMS results are not inferred into direction-specific outcomes.'))}</p>
        </section>`;
        const matrix=detail.querySelector('.p134-layer');
        const anchor=matrix||detail.querySelector('[data-p131-added]')||detail.querySelector('.p110-section');
        if(anchor)anchor.insertAdjacentHTML('afterend',html);
      };
      const mo=new MutationObserver(()=>requestAnimationFrame(render));
      mo.observe(detail,{childList:true,subtree:true}); render();
    }

    function ledger(){
      const root=document.querySelector('[data-phase100]'); if(!root)return;
      const summary=document.querySelector('.p100-summary')?.closest('section');
      if(!summary||document.querySelector('[data-p176-overview]'))return;
      const ownFunctionObservations=real.reduce((n,r)=>n+Object.values(r.tests||{}).reduce((m,tests)=>m+Object.values(tests||{}).filter(ok).length,0),0);
      const extCount=external.length;
      const offCount=official.length;
      const block=document.createElement('section');
      block.className='section'; block.dataset.p176Overview='';
      block.innerHTML=`<div class="container"><div class="p176-overview"><div class="section-heading"><div><p class="eyebrow">Phase176 · Evidence Moat</p><h2>${esc(t('実機証拠を「量」ではなく、機能単位で積み上げる','Build evidence by function, not by inflated record counts'))}</h2><p>${esc(t('SolQvia実機、外部実機、公式・仕様、未確認を分離します。未確認を推測で埋めず、次の検証対象として残します。','SolQvia first-party tests, external field tests, official/specification data and unknowns remain separate. Unknowns become verification work, not inferred claims.'))}</p></div></div>
      <div class="p176-overview-grid"><div class="p176-overview-card"><b>${real.length}</b><span>${esc(t('SolQvia実機レコード','SolQvia real-device records'))}</span></div><div class="p176-overview-card"><b>${ownFunctionObservations}</b><span>${esc(t('実機で確認済み機能観測','Confirmed first-party function observations'))}</span></div><div class="p176-overview-card"><b>${extCount}</b><span>${esc(t('外部実機レコード','External field-test records'))}</span></div><div class="p176-overview-card"><b>${offCount}</b><span>${esc(t('型番別公式・詳細レコード','Exact-model official/detail records'))}</span></div><div class="p176-overview-card"><b>12</b><span>${esc(t('実動作を分離する標準機能','Standard runtime functions'))}</span></div><div class="p176-overview-card"><b>0</b><span>${esc(t('混合証拠の総合点','Mixed-evidence composite scores'))}</span></div></div>
      <p class="p176-boundary"><strong>${esc(t('公開ルール','Publication rule'))}</strong>${esc(t('ユーザー報告は審査前にSolQvia実機へ昇格させません。外部動作確認もSolQvia実機とは表示しません。','User reports are never promoted to SolQvia real-device evidence before editorial review, and external field tests never become first-party evidence.'))}</p></div></div>`;
      summary.insertAdjacentElement('afterend',block);
    }
    passport(); ledger();
  }).catch(()=>{});
})();