(()=>{
  const root=document.querySelector('[data-phase174-mnp-diagnosis]');
  if(!root)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stateLabel=s=>({
    supported:'ワンストップ対応',
    not_supported_or_number_required:'予約番号方式',
    scope_limited:'適用範囲を要確認',
    unconfirmed:'未確認',
    unknown:'未確認'
  })[s]||s;
  const severityRank={hard_stop:0,verify:1,blocker:2,route:3,info:4};
  const taxonomyLabel=new Map();
  Promise.all([
    fetch('/assets/data/phase174-mnp-diagnosis-rules-v1.json').then(r=>r.json()),
    fetch('/assets/data/phase171-mnp-reservation-deep-master-v1.json').then(r=>r.json())
  ]).then(([rules,master])=>{
    for(const x of rules.taxonomy||[])taxonomyLabel.set(x.id,x.label);
    const providers=rules.providers||[];
    const providerMap=new Map(providers.map(p=>[p.id,p]));
    const masterMap=new Map((master.records||[]).map(p=>[p.id,p]));
    const opts=providers.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.provider)+'</option>').join('');
    const issues=(rules.taxonomy||[]).filter(x=>!['contract_data','contract_sms','one_stop'].includes(x.id)).map(x=>
      '<label class="p174-check"><input type="checkbox" value="'+esc(x.id)+'"><span>'+esc(x.label)+'</span></label>'
    ).join('');
    root.innerHTML=
      '<div class="p174-head"><div><p class="eyebrow">Phase174 · MNP Diagnosis Engine</p><h2>MNP予約番号が出ない・ワンストップで止まる原因を診断</h2><p>現在公式再確認済みの23サービスを対象に、契約種別・手続き方式・進行中の状態から、確認すべき原因と次の操作を絞り込みます。</p></div><span>23 current-exact services</span></div>'+
      '<div class="p174-form">'+
        '<label><b>1. 転出元</b><select id="p174Provider"><option value="">事業者を選択</option>'+opts+'</select></label>'+
        '<fieldset><legend>2. 契約種別</legend><label><input type="radio" name="p174Contract" value="voice" checked> 音声通話あり</label><label><input type="radio" name="p174Contract" value="data"> データ専用</label><label><input type="radio" name="p174Contract" value="sms"> SMS専用/データ+SMS</label><label><input type="radio" name="p174Contract" value="unknown"> 不明</label></fieldset>'+
        '<fieldset><legend>3. 希望する手続き</legend><label><input type="radio" name="p174Flow" value="unknown" checked> どちらでもよい/不明</label><label><input type="radio" name="p174Flow" value="one_stop"> MNPワンストップ</label><label><input type="radio" name="p174Flow" value="reservation"> 予約番号を発行</label></fieldset>'+
        '<fieldset><legend>4. 当てはまる状態</legend><div class="p174-check-grid">'+issues+'</div></fieldset>'+
        '<button id="p174Run" type="button">診断する</button>'+
      '</div><div id="p174Result" class="p174-result" aria-live="polite"></div>';

    const providerEl=root.querySelector('#p174Provider');
    const resultEl=root.querySelector('#p174Result');
    const checked=(name)=>root.querySelector('input[name="'+name+'"]:checked')?.value||'unknown';

    const card=(kind,title,body,evidence=[])=>{
      const ev=evidence.length?'<details><summary>根拠になった登録条件</summary><ul>'+evidence.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>':'';
      return '<article class="p174-outcome '+esc(kind)+'"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p>'+ev+'</article>';
    };
    const run=()=>{
      const id=providerEl.value;
      if(!id){resultEl.innerHTML='<div class="p174-empty">転出元の事業者を選択してください。</div>';return}
      const p=providerMap.get(id), src=masterMap.get(id);
      if(!p||!src){resultEl.innerHTML='<div class="p174-empty">この事業者の診断データを読み込めませんでした。</div>';return}
      const contract=checked('p174Contract'), flow=checked('p174Flow');
      const selected=[...root.querySelectorAll('.p174-check input:checked')].map(x=>x.value);
      const out=[];

      if(contract==='data'){
        if(p.contract.data_only==='ineligible')out.push({rank:0,html:card('hard','この契約種別はMNP対象外','現在の公式記録ではデータ専用契約はMNP転出対象外です。予約番号発行を繰り返しても解決しません。音声契約への変更可否や別の解約手順を公式案内で確認してください。')});
        else if(p.contract.data_only==='verify')out.push({rank:1,html:card('verify','データ専用契約は対象可否の個別確認が必要','この事業者についてはデータ専用契約をMNP対象と断定できません。契約種別・電話番号種別を公式窓口で確認してください。')});
      }
      if(contract==='sms'){
        if(p.contract.sms_only==='ineligible')out.push({rank:0,html:card('hard','SMS専用/データ+SMS契約はMNP対象外','現在の公式記録ではこの契約種別はMNP転出対象外です。')});
        else if(p.contract.sms_only==='verify')out.push({rank:1,html:card('verify','SMS専用契約は対象可否の個別確認が必要','MNP対象であることを公式情報から確認できていません。契約種別を確認してください。')});
      }

      if(flow==='one_stop'){
        if(p.one_stop.state==='supported')out.push({rank:3,html:card('route','ワンストップを優先できます',p.one_stop.recommendation)});
        else if(p.one_stop.state==='not_supported_or_number_required')out.push({rank:0,html:card('hard','予約番号方式が必要',p.one_stop.recommendation)});
        else out.push({rank:1,html:card('verify','転出元としてのワンストップ適用を要確認',p.one_stop.recommendation)});
      }
      if(flow==='reservation'&&p.one_stop.state==='supported'){
        out.push({rank:4,html:card('info','予約番号方式も選べます','転出先がMNPワンストップ対応なら予約番号を事前発行しない方法もあります。予約番号方式を選ぶ場合は発行済み番号との競合に注意してください。')});
      }

      for(const cat of selected){
        if(cat==='expired_reservation'){
          out.push({rank:2,html:card('blocker','期限切れ・再発行',p.reissue||'失効後の再発行条件を公式窓口で確認してください。')});
          continue;
        }
        if(cat==='issue_waiting'){
          out.push({rank:4,html:card('info','発行待ちの目安',p.issue_timing||'固定の発行時間は確認できません。公式画面・通知経路を確認してください。')});
          continue;
        }
        if(cat==='active_reservation'){
          const rs=p.issue_rules.filter(r=>r.category==='active_reservation');
          if(rs.length)for(const r of rs)out.push({rank:2,html:card('blocker','発行済み予約番号が競合している可能性',r.next_action,r.evidence)});
          else out.push({rank:2,html:card('blocker','発行済み予約番号を確認','有効期限・取消可否・再発行条件を確認してください。再発行条件: '+(p.reissue||'公式窓口で確認'))});
          continue;
        }
        const rs=p.issue_rules.filter(r=>r.category===cat);
        if(rs.length){
          for(const r of rs)out.push({rank:2,html:card('blocker',taxonomyLabel.get(cat)||'確認項目',r.next_action,r.evidence)});
        }else{
          out.push({rank:1,html:card('verify',(taxonomyLabel.get(cat)||'選択した状態')+'は個別確認','この事業者のcurrent-exact記録では、この条件を発行不可原因として明確に確認できていません。別原因を断定せず、公式窓口・契約画面を確認してください。')});
        }
      }

      if(!selected.length&&contract==='voice'&&flow==='unknown'){
        out.push({rank:4,html:card('info','通常の発行経路',p.primary_route.label+(p.primary_route.entry?'：'+p.primary_route.entry:'')+(p.primary_route.hours?' / '+p.primary_route.hours:''))});
        out.push({rank:4,html:card('info','発行目安',p.issue_timing||'固定の発行時間は公式確認できません。')});
      }

      if(p.real_account_observation){
        out.push({rank:4,html:'<article class="p174-observation"><h3>SolQvia実利用観測</h3><p>公式仕様とは別レイヤーです。</p><ul>'+(p.real_account_observation.findings||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><small>'+esc(p.real_account_observation.scope||'')+'</small></article>'});
      }

      out.sort((a,b)=>a.rank-b.rank);
      const head='<div class="p174-summary"><div><b>'+esc(p.provider)+'</b><span>'+esc(stateLabel(p.one_stop.state))+'</span></div><div><b>有効期限</b><span>'+(p.validity_days?esc(p.validity_days+'日'):'要確認')+'</span></div><div><b>主な窓口</b><span>'+esc(p.primary_route.label)+'</span></div></div>';
      const links='<div class="p174-links">'+(p.article_url?'<a href="'+esc(p.article_url)+'">詳しいSolQvia解説</a>':'')+(p.official_sources||[]).slice(0,3).map((u,i)=>'<a target="_blank" rel="noopener noreferrer" href="'+esc(u)+'">公式'+(i+1)+'</a>').join('')+'</div>';
      resultEl.innerHTML=head+out.map(x=>x.html).join('')+links+'<p class="p174-boundary">この診断は入力された状態とcurrent-exact公式情報を照合するものです。契約画面を直接読み取っているわけではないため、選択していない契約状態を推測しません。</p>';
    };
    root.querySelector('#p174Run').addEventListener('click',run);
    providerEl.addEventListener('change',()=>{if(providerEl.value)run()});
  }).catch(()=>{root.innerHTML='<div class="p174-empty">MNP診断データを読み込めませんでした。</div>'});
})();