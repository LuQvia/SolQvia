(()=>{
  const root=document.querySelector('[data-phase170]');
  if(!root)return;
  const lang=document.documentElement.lang==='en'?'en':'ja';
  const t=(ja,en)=>lang==='en'?en:ja;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const levelLabel=v=>({
    data_and_message:t('データ＋メッセージ','Data + messaging'),
    message_only:t('メッセージのみ','Messaging only'),
    not_listed:t('現行一覧で一致なし','No current-list match'),
    unknown:t('未確認','Unknown'),
    explicitly_unsupported:t('公式に対象外','Explicitly unsupported'),
    future_listed:t('発売前候補','Future listed'),
    future_announced:t('将来候補','Future announced'),
    iot_listed_feature_level_unresolved:t('機能レベル要確認','Feature level unresolved')
  })[v]||String(v||t('未確認','Unknown'));
  const platformOf=r=>{
    const n=(r?.model_name||'').toLowerCase();
    if(n.includes('iphone'))return 'ios';
    if(n.includes('apple watch'))return 'watch';
    if((r?.device_class||'').toLowerCase().includes('smartphone')||r?.id?.startsWith('smartphone-')||/^phase1/.test(r?.id||''))return 'android';
    return 'other';
  };
  const serviceKeys={
    au_starlink_direct:'au_starlink_direct_level',
    docomo_starlink_direct:'docomo_starlink_direct_level',
    softbank_starlink_direct:'softbank_starlink_direct_level'
  };
  const providerField={
    au_starlink_direct:'au_starlink_direct',
    docomo_starlink_direct:'docomo_starlink_direct',
    softbank_starlink_direct:'softbank_starlink_direct'
  };
  const humanMap={
    current_weather:t('現在地の天気','Current weather'),warnings:t('警報・注意報','Warnings'),rain_thunder_radar:t('雨雲・雷レーダー','Rain/thunder radar'),weather_charts:t('天気図','Weather charts'),satellite_optimized_ai_chat:t('衛星向けAIチャット','Satellite-optimized AI chat'),
    paid_membership_registration_unavailable:t('有料会員登録は不可','Paid membership registration unavailable'),initial_au_id_login_unavailable:t('初回au IDログイン不可','Initial au ID login unavailable'),some_features_only:t('一部機能のみ','Some features only'),
    feed_video_disabled:t('フィード動画再生なし','Feed video disabled'),images_hidden_or_compressed:t('画像は非表示または圧縮','Images hidden or compressed'),location_restricted:t('位置情報に制限','Location restricted'),notifications_restricted:t('通知に制限','Notifications restricted'),external_site_navigation_restricted:t('外部サイト遷移に制限','External-site navigation restricted'),
    push_unavailable:t('PUSH通知不可','Push unavailable'),map_display_unavailable:t('地図表示不可','Map display unavailable'),subscription_purchase_unavailable:t('サブスク購入不可','Subscription purchase unavailable'),chatbot_unavailable:t('チャットボット不可','Chatbot unavailable'),
    share_current_location:t('現在地共有','Share current location'),log_recording:t('ログ記録','Log recording'),change_descent_time:t('下山時間変更','Change descent time'),sos_to_emergency_contact_and_police:t('緊急連絡者・警察へのSOS','SOS to emergency contact/police'),emergency_reporting_in_satellite_mode:t('衛星モードで緊急通報機能','Emergency reporting in satellite mode'),
    some_features_restricted:t('一部機能に制限','Some features restricted'),text_chat:t('テキストトーク','Text chat'),stickers_unavailable:t('スタンプ不可','Stickers unavailable'),emoji_unavailable:t('絵文字不可','Emoji unavailable'),image_video_transfer_unavailable:t('画像・動画送受信不可','Image/video transfer unavailable'),voice_call_unavailable:t('音声通話不可','Voice calls unavailable'),video_call_unavailable:t('ビデオ通話不可','Video calls unavailable'),
    location_send:t('位置情報送信','Location send'),location_send_button_operates_only_while_starlink_connected:t('位置送信ボタンは衛星接続中のみ動作','Location button works only while Starlink is connected'),nikkei_id_registration_unavailable:t('日経ID登録不可','Nikkei ID registration unavailable'),login_unavailable:t('ログイン不可','Login unavailable'),mail_send_receive:t('メール送受信','Mail send/receive'),initial_setup_unavailable:t('初期設定不可','Initial setup unavailable'),mail_settings_unavailable:t('メール設定不可','Mail settings unavailable'),
    disaster_message_board_safety_registration:t('災害用伝言板の安否登録','Disaster-board safety registration'),disaster_message_board_safety_confirmation:t('災害用伝言板の安否確認','Disaster-board safety confirmation'),COCOHELI_SOS_DIRECT_supported:'COCOHELI SOS DIRECT',
    sms:'SMS',rcs:'RCS',location_share:t('位置情報共有','Location sharing'),file_transfer_where_device_supports:t('対応端末でファイル送受信','File transfer on supported devices'),imessage:'iMessage',
    update_os_before_off_grid:t('圏外へ出る前にOS更新','Update OS before going off-grid'),update_apps_before_off_grid:t('圏外へ出る前にアプリ更新','Update apps before going off-grid'),service_or_plan_entitlement_required:t('対象回線・プラン条件あり','Eligible line/plan required'),
    supported_ISP_required_for_app_data_spmode_or_mopera:t('アプリ通信は指定ISP（spmode.ne.jp / mopera.net）が必要','Supported ISP required for app data (spmode.ne.jp / mopera.net)'),AnshinSecurity_dangerous_site_protection_may_interfere:t('あんしんセキュリティの危険サイト対策で一部利用できない場合あり','Anshin Security web protection may interfere'),
    flat_rate_data_plan_or_web_usage_fee_required_for_app_data_MMS_RCS:t('アプリ通信・MMS・RCSは対象データプランまたはウェブ使用料が必要','Eligible data plan or web usage fee required for app data/MMS/RCS')
  };
  const formatRestriction=x=>humanMap[x]||String(x||'').replaceAll('_',' ');
  Promise.all([
    fetch('/assets/data/phase170-satellite-app-feature-matrix-v1.json').then(r=>r.json()),
    fetch('/assets/data/phase167-satellite-exact-device-eligibility-v1.json').then(r=>r.ok?r.json():({records:[]})),
    fetch('/assets/data/phase168-satellite-priority-existing-exact-v1.json').then(r=>r.ok?r.json():({records:[]})),
    fetch('/assets/data/phase169-satellite-legacy-completion-v1.json').then(r=>r.ok?r.json():({records:[]}))
  ]).then(([matrix,p167,p168,p169])=>{
    const catalog=new Map((matrix.app_catalog||[]).map(a=>[a.id,a]));
    const serviceMap=new Map((matrix.services||[]).map(s=>[s.id,s]));
    const records=new Map();
    for(const src of [p169,p168,p167])for(const x of(src.records||[]))records.set(x.id,x);
    const select=document.querySelector('#p108Device');
    const renderEmpty=()=>{
      root.innerHTML='<div class="p170-head"><div><p class="eyebrow">Phase170 · App / Feature Compatibility</p><h2>'+esc(t('端末別の対応アプリ・機能範囲','Device-specific app and feature scope'))+'</h2><p>'+esc(t('端末を選ぶと、各キャリアの衛星通信で使えるメッセージ範囲・対応アプリ・制約・海外条件を表示します。','Select a device to show carrier satellite messaging scope, supported apps, limitations and overseas conditions.'))+'</p></div><span class="p170-date">2026-09-22</span></div><div class="p108-note warn">'+esc(t('上の端末選択から機種を選んでください。','Select a device above.'))+'</div>';
    };
    const appList=(svc,platform,level)=>{
      if(level!=='data_and_message')return '';
      if(!['ios','android'].includes(platform))return '<p class="p170-muted">'+esc(t('この端末種別のアプリ一覧は未定義です。','The app list is not defined for this device class.'))+'</p>';
      const ids=svc.apps?.[platform]||[];
      const cards=ids.map(id=>{
        const a=catalog.get(id)||{name:id,category:'other'};
        const ov=svc.apps?.overrides?.[id]||{};
        const feats=(ov.available_features||[]).map(formatRestriction);
        const lims=(ov.limitations||[]).map(formatRestriction);
        return '<li><strong>'+esc(a.name)+'</strong><span>'+esc(a.category)+'</span>'+((feats.length||lims.length)?'<small>'+esc([
          feats.length?t('利用確認: ','Features: ')+feats.join(', '):'',
          lims.length?t('制限: ','Limits: ')+lims.join(', '):''
        ].filter(Boolean).join(' / '))+'</small>':'')+'</li>';
      }).join('');
      return '<details class="p170-app-details"><summary>'+esc(t('対応アプリ '+ids.length+'件を表示','Show '+ids.length+' listed apps'))+'</summary><ul class="p170-app-list">'+cards+'</ul></details>';
    };
    const overseasText=svc=>{
      const o=svc.overseas;
      if(!o)return '';
      const countries=o.countries||o.launch_countries||[];
      const status=o.status==='available'?t('提供中','Available'):o.status==='scheduled'?t('提供予定','Scheduled'):o.status;
      return '<div class="p170-overseas"><b>'+esc(t('海外','Overseas'))+': '+esc(status)+'</b><span>'+esc(countries.join(', ')||'—')+'</span>'+(o.start_date?'<span>'+esc(t('開始日','Start date'))+': '+esc(o.start_date)+'</span>':'')+'<small>'+esc(o.note||'')+'</small></div>';
    };
    const serviceCard=(r,platform,serviceId)=>{
      const svc=serviceMap.get(serviceId);
      if(!svc)return '';
      const key=serviceKeys[serviceId];
      const level=r.runtime_mapping?.[key]||r[key]||'unknown';
      const msg=svc.messaging||{};
      const msgBits=[];
      for(const [k,v] of Object.entries(msg)){
        if(v===true)msgBits.push(k);
        else if(v===false)msgBits.push(k+':×');
        else if(v)msgBits.push(k+':'+String(v).replaceAll('_',' '));
      }
      const gate=level==='data_and_message'
        ?t('対応アプリのデータ通信候補','Supported-app data candidate')
        :level==='message_only'
          ?t('アプリデータ不可・メッセージのみ','No app data; messaging only')
          :t('アプリ通信は現在の公式対応として確認しない','App data is not currently confirmed');
      const setup=(svc.setup||[]).map(formatRestriction);
      const prov=r.provider_eligibility?.[providerField[serviceId]];
      const scope=prov?.scope||'';
      return '<article class="p170-service" data-level="'+esc(level)+'"><div class="p170-service-head"><div><h3>'+esc(svc.label)+'</h3><span class="p170-level">'+esc(levelLabel(level))+'</span></div><span class="p170-platform">'+esc(platform.toUpperCase())+'</span></div><p class="p170-gate">'+esc(gate)+'</p><div class="p170-facts"><div><b>'+esc(t('端末判定','Device scope'))+'</b><span>'+esc(scope||t('記録済み判定を使用','Uses mapped record state'))+'</span></div><div><b>'+esc(t('メッセージ/機能','Messaging / features'))+'</b><span>'+esc(msgBits.join(' · '))+'</span></div><div><b>'+esc(t('事前条件','Setup'))+'</b><span>'+esc(setup.join(' · ')||'—')+'</span></div></div>'+appList(svc,platform,level)+overseasText(svc)+'</article>';
    };
    const render=()=>{
      const id=select?.value||'';
      const r=records.get(id);
      if(!r){renderEmpty();return}
      const platform=platformOf(r);
      const apple=serviceMap.get('apple_native_satellite');
      const google=serviceMap.get('google_pixel_satellite_sos');
      const native=[];
      if(r.runtime_mapping?.apple_native_satellite_japan)native.push('<span>'+esc(t('Apple純正衛星: 対応','Apple native satellite: available'))+'</span>');
      if(r.runtime_mapping?.google_native_satellite_device_eligible)native.push('<span>'+esc(t('Pixel Satellite SOS端末条件: 対象 / 日本提供なし','Pixel Satellite SOS device-eligible / unavailable in Japan'))+'</span>');
      if(!native.length)native.push('<span>'+esc(t('端末内蔵型の日本向け経路: 確認なし','No confirmed handset-native Japan path'))+'</span>');
      root.innerHTML='<div class="p170-head"><div><p class="eyebrow">Phase170 · App / Feature Compatibility</p><h2>'+esc(r.model_name||id)+'</h2><p>'+esc(t('「衛星対応」を1つのON/OFFにせず、キャリア・OS・アプリ・機能・地域を分離して表示します。','Satellite support is separated by carrier, OS, app, feature and region rather than one yes/no flag.'))+'</p></div><span class="p170-date">2026-09-22</span></div><div class="p170-native">'+native.join('')+'</div><div class="p170-grid">'+['au_starlink_direct','docomo_starlink_direct','softbank_starlink_direct'].map(id=>serviceCard(r,platform,id)).join('')+'</div><div class="p170-boundary">'+esc(t('注意: 対応アプリに掲載されていても、アプリ内の全機能が衛星経由で使えるとは限りません。未掲載アプリも事業者側で通信可能な場合があるため、SolQviaでは未掲載を恒久的な非対応とは扱いません。','Note: A listed app does not mean every in-app feature works over satellite. Providers may also support unlisted apps, so SolQvia does not treat “not listed” as permanent incompatibility.'))+'</div>';
    };
    if(select)select.addEventListener('change',render);
    render();
  }).catch(()=>{
    root.innerHTML='<div class="p108-note warn">'+esc(t('対応アプリ・機能データを読み込めませんでした。','Could not load app/feature compatibility data.'))+'</div>';
  });
})();