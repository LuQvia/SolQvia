(()=>{
  const detail=document.getElementById('p110Detail');
  if(!detail)return;

  const lang=document.documentElement.lang==='en'?'en':'ja';
  const t=(ja,en)=>lang==='en'?en:ja;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const load=u=>fetch(u).then(r=>r.ok?r.json():Promise.reject(new Error(u)));

  let overlay={records:[]};

  const statusLabel=v=>({
    confirmed:t('確認済み','Confirmed'),
    failed:t('失敗確認','Failed'),
    unknown:t('未確認','Unknown'),
    not_tested:t('未検証','Not tested'),
    not_solqvia_tested:t('SolQvia実機未確認','Not tested by SolQvia'),
    partial_snapshot:t('部分一致','Partial snapshot'),
    same_model_only:t('型番一致のみ','Same model only'),
    unbound:t('未結合','Unbound'),
    partial:t('深層データ：部分','Deep evidence: partial'),
    software_only:t('Softwareのみ','Software only'),
    capability_plus_software:t('仕様＋Software','Capability + software'),
    solqvia_capture:t('SolQvia実機Captureあり','SolQvia capture available')
  })[v]||String(v??t('未確認','Unknown'));

  const statusClass=v=>{
    if(v==='confirmed')return'is-confirmed';
    if(v==='unknown')return'is-unknown';
    if(v==='not_tested'||v==='not_solqvia_tested')return'is-not-tested';
    return'';
  };

  function findRecord(name,number,carrierName){
    return overlay.records.find(x=>x.model_number&&number&&norm(x.model_number)===norm(number)&&(!x.original_carrier||!carrierName||norm(x.original_carrier)===norm(carrierName)))
      ||overlay.records.find(x=>x.model_number&&number&&norm(x.model_number)===norm(number))
      ||overlay.records.find(x=>norm(x.model_name)===norm(name)&&(!x.original_carrier||!carrierName||norm(x.original_carrier)===norm(carrierName)));
  }

  function row(label,value){
    if(value===null||value===undefined||value==='')return'';
    const s=typeof value==='object'?(value.state??JSON.stringify(value)):value;
    return '<div class="p163-deep-row"><dt>'+esc(label)+'</dt><dd class="'+statusClass(s)+'">'+esc(statusLabel(s))+'</dd></div>';
  }

  function softwareCard(r){
    const s=r?.software;
    if(!s)return'';
    const baseband=s.baseband_full||s.baseband_suffix||(t('未確認','Unknown'));
    return '<section class="p163-deep-card"><h4>'+esc(t('Software Snapshot','Software snapshot'))+'</h4><dl class="p163-deep-list">'
      +row('OS',s.os||t('未確認','Unknown'))
      +row(t('ベンダーUI','Vendor UI'),s.vendor_ui||t('未確認','Unknown'))
      +row('Baseband',baseband)
      +row(t('更新日','Update date'),s.device_update_date||t('未確認','Unknown'))
      +row(t('実動作との結合','Runtime binding'),s.binding_state||'unknown')
      +'</dl></section>';
  }

  function dataCard(r){
    if(!r?.data)return'';
    const d=r.data;
    return '<section class="p163-deep-card"><h4>'+esc(t('登録・データ通信','Registration & data'))+'</h4><dl class="p163-deep-list">'
      +row(t('データ通信','Mobile data'),d.mobile_data)
      +row('5G SA',d.fiveg_sa)
      +row('APN / DNN',d.apn_dnn)
      +row(t('PDN/PDUセッション','PDN/PDU session'),d.packet_session)
      +row('DNS',d.dns)
      +row(t('Internet検証','Internet validation'),d.validation)
      +'</dl></section>';
  }

  function imsCard(r){
    if(!r?.ims)return'';
    const x=r.ims;
    return '<section class="p163-deep-card"><h4>IMS / '+esc(t('通話・SMS','Voice & SMS'))+'</h4><dl class="p163-deep-list">'
      +row(t('一般音声','Generic voice'),x.generic_voice)
      +row(t('一般SMS','Generic SMS'),x.generic_sms)
      +row('IMS registration',x.ims_registration)
      +row('VoLTE registration',x.volte_registration)
      +row('VoNR registration',x.vonr_registration)
      +row(t('発信','Outgoing voice'),x.voice_outgoing)
      +row(t('着信','Incoming voice'),x.voice_incoming)
      +row(t('SMS送信','SMS send'),x.sms_send)
      +row(t('SMS受信','SMS receive'),x.sms_receive)
      +'</dl></section>';
  }

  function esimCard(r){
    if(!r?.esim)return'';
    const x=r.esim;
    return '<section class="p163-deep-card"><h4>eSIM RSP</h4><dl class="p163-deep-list">'
      +row(t('eSIM機能','eSIM capability'),x.device_capability)
      +row(t('プロファイル設定','Profile install'),x.profile_install)
      +row(t('プロファイル有効化','Profile enable'),x.profile_enable)
      +row(t('回線開通','Carrier activation'),x.carrier_line_activation)
      +row(t('ネットワーク登録','Network registration'),x.network_registration)
      +'</dl></section>';
  }

  function radioCard(r){
    if(!r?.aggregation)return'';
    const x=r.aggregation;
    let extra='';
    if(Number.isFinite(x.lte_single_band_count))extra+=row(t('LTE単独Band数','LTE single-band count'),String(x.lte_single_band_count));
    if(Number.isFinite(x.nr_single_band_count))extra+=row(t('NR単独Band数','NR single-band count'),String(x.nr_single_band_count));
    return '<section class="p163-deep-card"><h4>'+esc(t('LTE CA / EN-DC / NR CA','LTE CA / EN-DC / NR CA'))+'</h4><dl class="p163-deep-list">'
      +extra
      +row('LTE CA',x.lte_ca)
      +row('EN-DC',x.endc)
      +row('NR CA',x.nr_ca)
      +(Number.isFinite(x.observed_component_carriers)?row(t('実測Component Carrier','Observed component carriers'),String(x.observed_component_carriers)):'')
      +'</dl></section>';
  }

  function carrierCard(r){
    if(!r?.carrier_configuration)return'';
    const x=r.carrier_configuration;
    return '<section class="p163-deep-card"><h4>CarrierConfig / Carrier Settings</h4><dl class="p163-deep-list">'
      +row(t('設定状態','Configuration state'),x.state)
      +row('Carrier ID',x.carrier_id)
      +row('IMS policy',x.ims_policy)
      +'</dl></section>';
  }

  function captureCard(r){
    if(!r?.captures?.length)return'';
    const items=r.captures.map(c=>'<div class="p163-capture"><strong>'+esc(c.carrier||'—')+' · '+esc(c.tested_at||'—')+'</strong><span>'
      +esc(t('実機Capture','Real-device capture'))+' / '+esc(statusLabel(c.binding_state||'unbound'))+' / '
      +esc(Object.entries(c.observations||{}).map(([k,v])=>k+': '+v).join(' · '))+'</span></div>').join('');
    return '<section class="p163-deep-card"><h4>'+esc(t('SolQvia実機Capture','SolQvia real-device captures'))+'</h4><div class="p163-captures">'+items+'</div></section>';
  }

  function actions(){
    const root=lang==='en'?'/en/technology/smartphone/':'/ja/technology/smartphone/';
    const defs=[
      ['sim-esim-compatibility-diagnosis/',t('SIM/eSIM','SIM/eSIM'),t('認識・eSIM設定を確認','Check recognition & eSIM setup')],
      ['network-sim-troubleshooting/',t('圏外・登録','No service / registration'),t('圏内・ネットワーク登録を切り分け','Separate service and registration')],
      ['carrier-apn-sim-troubleshooting/',t('データ・APN','Data / APN'),t('データ回線・APNを確認','Check data line and APN')],
      ['communication-compatibility-lab/',t('通話・SMS','Voice / SMS'),t('IMS・発着信・SMSを確認','Check IMS, calling and SMS')]
    ];
    return defs.map(([slug,title,sub])=>'<a href="'+root+slug+'"><strong>'+esc(title)+'</strong><span>'+esc(sub)+' →</span></a>').join('');
  }

  function deepHtml(r){
    if(!r){
      return '<details class="p163-deep-details"><summary>'+esc(t('Phase154〜162の深層記録を見る','View Phase154–162 deep evidence'))+'</summary><div class="p163-deep-body"><p class="p163-evidence-note">'
        +esc(t('この型番には、Phase154〜162の追加深層レコードをまだ登録していません。未登録は非対応を意味しません。下に続く既存の型番別仕様・証拠マトリクスを確認してください。','No additional Phase154–162 exact-model deep record is registered for this model yet. This does not mean unsupported; use the existing exact-model specification and evidence matrix below.'))
        +'</p></div></details>';
    }
    const cards=[softwareCard(r),carrierCard(r),esimCard(r),dataCard(r),imsCard(r),radioCard(r),captureCard(r)].filter(Boolean).join('');
    return '<details class="p163-deep-details"><summary>'+esc(t('深層技術・証拠を開く','Open deep technical evidence'))+'</summary><div class="p163-deep-body"><div class="p163-deep-grid">'+cards+'</div><p class="p163-evidence-note">'+esc(r.evidence_note||'')+'</p><p class="p163-existing-note">'+esc(t('詳細な一次情報URL・既存証拠マトリクスは、このセクションより下の従来Passport表示を正本として参照してください。','For detailed primary-source URLs and the existing evidence matrix, use the original Passport sections below as the authoritative view.'))+'</p></div></details>';
  }

  function augment(){
    if(detail.dataset.p163Busy==='1')return;
    detail.dataset.p163Busy='1';
    try{
      const head=detail.querySelector('.p110-passport-head');
      const answer=detail.querySelector('[data-p144-answer]');
      if(!head||!answer)return;

      const name=head.querySelector('h2')?.textContent?.trim()||'';
      const meta=head.querySelector('p:not(.eyebrow)')?.textContent||'';
      const parts=meta.split('/');
      const number=parts[0]?.trim()||'';
      const carrierName=parts.slice(1).join('/').trim();
      const signature=norm(name)+'|'+norm(number)+'|'+norm(carrierName);
      if(detail.dataset.p163Record===signature&&detail.querySelector('[data-p163-added]'))return;

      detail.querySelectorAll('[data-p163-added]').forEach(n=>n.remove());
      detail.dataset.p163Record=signature;

      answer.classList.add('p163-level-one');
      answer.id='p163-level1';

      const r=findRecord(name,number,carrierName);
      const depth=r?statusLabel(r.deep_coverage):t('深層記録未登録','Deep record not registered');
      const next=r?.next_question;

      const nav='<nav class="p163-tier-nav" data-p163-added aria-label="'+esc(t('Device Passport表示レベル','Device Passport levels'))+'">'
        +'<a href="#p163-level1"><span>1</span>'+esc(t('まず結論','Answer first'))+'</a>'
        +'<a href="#p163-level2"><span>2</span>'+esc(t('問題を解決','Troubleshoot'))+'</a>'
        +'<a href="#p163-level3"><span>3</span>'+esc(t('技術・証拠','Technical evidence'))+'</a>'
        +'</nav>';

      const nextHtml=next?'<div class="p163-next-check"><strong>'+esc(t('次に1つだけ確認','One next check'))+'</strong><span>'+esc(lang==='en'?next.en:next.ja)+'</span></div>':'';

      const level2='<section class="p163-level-two" id="p163-level2" data-p163-added><div class="p163-level-head"><div><p class="p163-level-kicker">Level 2 · Troubleshoot</p><h3>'
        +esc(t('症状から、次の確認へ','Move from the symptom to the next check'))+'</h3><p>'
        +esc(t('深層データがある場合はPhase161の次質問を優先し、ない場合は症状別診断へ進みます。','When deep evidence exists, the Phase161 next question is surfaced first; otherwise use the symptom-specific diagnostic.'))
        +'</p></div><span class="p163-depth-badge">'+esc(depth)+'</span></div>'+nextHtml+'<div class="p163-action-grid">'+actions()+'</div></section>';

      const level3='<section class="p163-level-three" id="p163-level3" data-p163-added><div class="p163-level-head"><div><p class="p163-level-kicker">Level 3 · Technical / Evidence</p><h3>'
        +esc(t('通信スタックと証拠を分離して確認','Inspect the stack and evidence separately'))+'</h3><p>'
        +esc(t('Software Snapshot、CarrierConfig、eSIM、登録、Data、IMS、CA/DCを、確認済み・未確認・未検証のまま表示します。','Software snapshot, CarrierConfig, eSIM, registration, data, IMS and CA/DC remain explicitly confirmed, unknown or untested.'))
        +'</p></div></div>'+deepHtml(r)+'</section>';

      answer.insertAdjacentHTML('beforebegin',nav);
      answer.insertAdjacentHTML('afterend',level2+level3);
    }finally{
      detail.dataset.p163Busy='0';
    }
  }

  load('/assets/data/phase163-device-passport-deep-overlay-v1.json')
    .then(x=>{overlay=x;augment();new MutationObserver(()=>augment()).observe(detail,{childList:true,subtree:false});})
    .catch(()=>{augment();new MutationObserver(()=>augment()).observe(detail,{childList:true,subtree:false});});
})();