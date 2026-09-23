(()=>{
  const roots=[...document.querySelectorAll('[data-phase171-mnp]')];
  if(!roots.length)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const yes=v=>v===true?'○':v===false?'×':'—';
  const freshness=r=>r.current_exact?'2026-09-23 公式再確認':'旧証拠日 '+(r.freshness?.source_checked_at||'未確認');
  const channelSummary=r=>{
    const c=r.channels||{};
    return [
      c.web?.available===true?'Web':'',
      c.app?.available===true?'アプリ':'',
      c.phone?.available===true?'電話':'',
      c.store?.available===true?'店頭':''
    ].filter(Boolean).join(' / ')||'要確認';
  };
  const oneStop=r=>{
    const s=String(r.one_stop?.status||'unknown');
    if(s.includes('supported'))return '対応';
    if(s==='対応')return '対応';
    if(s==='非対応')return '非対応';
    return s==='unknown'?'未確認':s;
  };
  const li=arr=>(arr||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
  const steps=r=>{
    const chunks=[];
    for(const [k,label] of [['web','Web'],['app','アプリ'],['phone','電話'],['store','店頭']]){
      const c=r.channels?.[k];
      if(!c||c.available!==true)continue;
      const meta=[c.hours,c.number,c.entry,c.location].filter(Boolean).join(' / ');
      chunks.push('<div class="p171-channel"><h4>'+esc(label)+'</h4><p>'+esc(meta||'利用可')+'</p>'+((c.steps||[]).length?'<ol>'+li(c.steps)+'</ol>':'')+'</div>');
    }
    return chunks.join('');
  };
  const sourceLinks=r=>(r.official_sources||[]).map((u,i)=>'<a href="'+esc(u)+'" rel="noopener noreferrer" target="_blank">公式'+(i+1)+'</a>').join(' ');
  const detail=r=>'<article class="p171-record" id="p171-'+esc(r.id)+'">'+
    '<div class="p171-record-head"><div><span class="p171-fresh '+(r.current_exact?'current':'legacy')+'">'+esc(freshness(r))+'</span><h3>'+esc(r.provider)+'</h3></div><span class="p171-one">ワンストップ: '+esc(oneStop(r))+'</span></div>'+
    '<div class="p171-kpis"><div><b>発行窓口</b><span>'+esc(channelSummary(r))+'</span></div><div><b>有効期限</b><span>'+esc(r.reservation_number?.validity_days?String(r.reservation_number.validity_days)+'日':'要確認')+'</span></div><div><b>発行目安</b><span>'+esc(r.reservation_number?.issue_timing||'要確認')+'</span></div><div><b>通知/確認</b><span>'+esc(r.reservation_number?.delivery||'要確認')+'</span></div></div>'+
    (r.current_exact?'<div class="p171-channels">'+steps(r)+'</div>':'<p class="p171-legacy-note">この事業者はPhase171で最新再検証していません。既存公式確認日を保持して表示しています。</p>')+
    ((r.authentication||[]).length?'<details><summary>本人確認・ログイン条件</summary><ul>'+li(r.authentication)+'</ul></details>':'')+
    ((r.blockers||[]).length?'<details><summary>発行できない・止まりやすい条件</summary><ul>'+li(r.blockers)+'</ul></details>':'')+
    ((r.special_rules||[]).length?'<details><summary>特殊契約・例外</summary><ul>'+li(r.special_rules)+'</ul></details>':'')+
    ((r.error_states||[]).length?'<details><summary>エラー・復旧</summary>'+r.error_states.map(x=>'<div class="p171-error"><b>'+esc(x.code||'エラー')+'</b><p>'+esc(x.meaning||'')+'</p><p><strong>対処:</strong> '+esc(x.resolution||'公式サポートへ確認')+'</p></div>').join('')+'</details>':'')+
    '<div class="p171-links">'+(r.article_url?'<a href="'+esc(r.article_url)+'">SolQvia解説</a> ':'')+sourceLinks(r)+'</div>'+
  '</article>';
  fetch('/assets/data/phase171-mnp-reservation-deep-master-v1.json').then(r=>r.json()).then(db=>{
    const map=new Map((db.records||[]).map(r=>[r.id,r]));
    for(const root of roots){
      const ids=String(root.dataset.mnpProvider||'').split(',').map(s=>s.trim()).filter(Boolean);
      if(ids.length){
        const recs=ids.map(id=>map.get(id)).filter(Boolean);
        root.innerHTML='<div class="p171-head"><div><p class="eyebrow">Phase172 · MNP Reservation Deep Master</p><h2>MNP予約番号の発行方法・発行できない条件</h2><p>予約番号方式とMNPワンストップを分け、発行窓口・受付時間・本人確認・再発行・特殊契約を確認します。</p></div><span>公式再確認: 2026-09-23</span></div><div class="p171-records">'+recs.map(detail).join('')+'</div>';
        continue;
      }
      const priority=(db.current_priority_ids||[]).map(id=>map.get(id)).filter(Boolean);
      root.innerHTML='<div class="p171-head"><div><p class="eyebrow">Phase172 · MNP Reservation Deep Master</p><h2>予約番号・ワンストップ手続き診断</h2><p>72サービスを統一形式で確認。最新再検証済みサービスは2026年9月23日公式再確認済み、残りは旧確認日を保持します。</p></div><span>72 services</span></div>'+
        '<div class="p171-search"><label for="p171Query">事業者名で検索</label><input id="p171Query" type="search" placeholder="例: docomo / povo / IIJmio"><small>「最新公式再確認」と「旧証拠日」を混同しない表示です。</small></div>'+
        '<div class="p171-priority"><h3>最新深掘り '+priority.length+'サービス</h3><div class="p171-records" id="p171Priority">'+priority.map(detail).join('')+'</div></div>'+
        '<div class="p171-all"><h3>全72サービス</h3><div class="p171-table-wrap"><table class="p171-table"><thead><tr><th>事業者</th><th>証拠鮮度</th><th>ワンストップ</th><th>発行窓口</th><th>発行目安</th><th>有効期限</th></tr></thead><tbody id="p171Rows"></tbody></table></div></div>';
      const input=root.querySelector('#p171Query'), tbody=root.querySelector('#p171Rows');
      const renderRows=()=>{
        const q=(input?.value||'').trim().toLowerCase();
        const rows=(db.records||[]).filter(r=>!q||[r.provider,r.provider_group].some(v=>String(v||'').toLowerCase().includes(q)));
        tbody.innerHTML=rows.map(r=>'<tr><td><strong>'+esc(r.provider)+'</strong>'+(r.article_url?'<br><a href="'+esc(r.article_url)+'">解説</a>':'')+'</td><td>'+esc(freshness(r))+'</td><td>'+esc(oneStop(r))+'</td><td>'+esc(channelSummary(r))+'</td><td>'+esc(r.reservation_number?.issue_timing||'要確認')+'</td><td>'+esc(r.reservation_number?.validity_days?String(r.reservation_number.validity_days)+'日':'要確認')+'</td></tr>').join('');
      };
      input?.addEventListener('input',renderRows);renderRows();
    }
  }).catch(()=>roots.forEach(root=>root.innerHTML='<div class="p171-warn">MNP手続きデータを読み込めませんでした。</div>'));
})();