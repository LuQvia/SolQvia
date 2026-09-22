(()=>{
  const root=document.querySelector('[data-phase166]');
  if(!root)return;
  const lang=document.documentElement.lang==='en'?'en':'ja';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=(ja,en)=>lang==='en'?en:ja;
  const labels={emergency_sos:t('緊急SOS','Emergency SOS'),direct_emergency_call:t('通常の緊急通報','Normal emergency calling'),personal_sms:'SMS',rcs:'RCS',imessage:'iMessage',mms:'MMS',file_attachment:t('ファイル添付','File attachments'),location_share:t('位置共有','Location sharing'),roadside_assistance:t('ロードサービス','Roadside assistance'),app_data:t('対応アプリデータ','Supported-app data'),browser_data:t('一般Web','General web'),voice_call:t('音声通話','Voice calls'),video_call:t('ビデオ通話','Video calls'),emergency_alerts:t('緊急速報','Emergency alerts'),ai_chat:'AI'};
  const val=v=>{if(v===null||v===undefined)return t('未確認','Unknown');if(typeof v==='boolean')return v?t('対応','Supported'):t('非対応','Unsupported');return String(v).replaceAll('_',' ')};
  Promise.all([
    fetch('/assets/data/phase166-satellite-public-summary-v1.json').then(r=>r.json()),
    fetch('/assets/data/phase166-satellite-service-matrix-v1.json').then(r=>r.json())
  ]).then(([summary,matrix])=>{
    const notes=(lang==='en'?summary.distinction_notes_en:summary.distinction_notes_ja)||[];
    const rows=(summary.japan_paths||[]).map(x=>'<tr><td><strong>'+esc(lang==='en'?x.label_en:x.label_ja)+'</strong><br><span class="p166-state">'+esc(lang==='en'?x.status_en:x.status_ja)+'</span></td><td>'+esc(lang==='en'?x.sos_en:x.sos_ja)+'</td><td>'+esc(lang==='en'?x.messaging_en:x.messaging_ja)+'</td><td>'+esc(lang==='en'?x.data_en:x.data_ja)+'</td><td>'+esc(lang==='en'?x.voice_en:x.voice_ja)+'</td><td>'+esc(lang==='en'?x.key_condition_en:x.key_condition_ja)+'</td></tr>').join('');
    const details=(matrix.services||[]).map(s=>{
      const fm=s.feature_matrix||{};
      const features=Object.keys(fm).map(k=>'<div class="p166-feature"><b>'+esc(labels[k]||k)+'</b><span>'+esc(val(fm[k]))+'</span></div>').join('');
      const ev=(s.evidence||[]).map(e=>'<li><a href="'+esc(e.url)+'" target="_blank" rel="noopener">'+esc(e.scope)+'</a></li>').join('');
      const boundary=s.boundary?'<div class="p166-boundary">'+esc(s.boundary)+'</div>':'';
      return '<details><summary>'+esc(s.service_name)+' · '+esc(s.japan_status||s.commercial_status||'')+'</summary><div class="p166-detail-body"><div class="p166-feature-grid">'+features+'</div>'+boundary+(ev?'<p><strong>'+esc(t('公式確認元','Official sources'))+'</strong></p><ul>'+ev+'</ul>':'')+'</div></details>';
    }).join('');
    root.innerHTML='<div class="p166-head"><div><p class="eyebrow">Phase166 · Satellite Deep Stack</p><h2>'+esc(t('衛星通信を「対応/非対応」だけで判定しない','Do not reduce satellite connectivity to one support flag'))+'</h2><p>'+esc(t('端末能力、OS、地域、回線・プラン、空の見通し、SOS経路、メッセージ、対応アプリデータ、音声、実機証拠を別々に確認します。','Separate device capability, OS, region, plan entitlement, sky visibility, SOS path, messaging, supported-app data, voice and runtime evidence.'))+'</p></div><span class="p166-date">'+esc(t('公式確認: 2026-09-22','Official check: 2026-09-22'))+'</span></div><div class="p166-note-grid">'+notes.map(n=>'<div class="p166-note">'+esc(n)+'</div>').join('')+'</div><div class="p166-table-wrap"><table class="p166-table"><thead><tr><th>'+esc(t('サービス経路','Service path'))+'</th><th>SOS</th><th>'+esc(t('メッセージ','Messaging'))+'</th><th>'+esc(t('データ','Data'))+'</th><th>'+esc(t('音声','Voice'))+'</th><th>'+esc(t('主要条件','Key conditions'))+'</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="p166-details">'+details+'</div>';
  }).catch(()=>{
    root.innerHTML='<div class="p108-note warn">'+esc(t('衛星深層データを読み込めませんでした。','Could not load satellite deep data.'))+'</div>';
  });
})();
