(() => {
  'use strict';

  const BASE_URL = 'https://luqevora.com/ja/mobile-connectivity/smartphone-plan-diagnosis/?utm_source=solqvia&utm_medium=referral&utm_campaign=plan_diagnosis&sq_bridge=mobile_plan';
  const PAGE_CONFIG = Object.freeze({
    '/ja/technology/smartphone/carrier-apn-sim-troubleshooting/': {},
    '/ja/technology/smartphone/smartphone-esim-not-activating/': {},
    '/ja/technology/smartphone/smartphone-apn-settings-not-working/': {},
    '/ja/technology/smartphone/japan-carrier-band-compatibility-guide-2026/': {}
  });

  const config = PAGE_CONFIG[location.pathname];
  if (!config || document.documentElement.lang !== 'ja') return;
  if (document.querySelector('[data-solqvia-plan-diagnosis-bridge]')) return;

  const content = document.querySelector('.article-content');
  if (!content) return;

  const destination = new URL(BASE_URL);
  if (config.current) destination.searchParams.set('current', config.current);

  const section = document.createElement('section');
  section.className = 'article-section solqvia-plan-diagnosis-bridge';
  section.dataset.solqviaPlanDiagnosisBridge = 'mobile_plan';
  section.setAttribute('aria-labelledby', 'solqvia-plan-diagnosis-title');

  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'padding:clamp(20px,4vw,32px);border:1px solid rgba(6,38,94,.18);border-radius:16px;background:#f7f9fc;';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = '技術問題が解決した後の見直し';

  const title = document.createElement('h2');
  title.id = 'solqvia-plan-diagnosis-title';
  title.textContent = '料金・データ容量・通話条件も確認する';

  const body = document.createElement('p');
  body.textContent = 'SIM/eSIMや回線設定の問題が解決したら、現在の料金・データ容量・通話条件が使い方に合っているかも確認できます。';

  const action = document.createElement('p');
  const link = document.createElement('a');
  link.href = destination.toString();
  link.textContent = 'Luqevoraの料金診断で確認する';
  link.dataset.bridgeId = 'mobile_plan';
  link.dataset.luqevoraRoute = 'smartphone-plan-diagnosis';
  link.style.cssText = 'display:inline-block;max-width:100%;box-sizing:border-box;padding:12px 18px;border-radius:10px;background:#06265e;color:#fff;font-weight:700;text-decoration:none;';
  action.appendChild(link);

  const disclosure = document.createElement('p');
  disclosure.style.cssText = 'margin-top:14px;font-size:.9em;line-height:1.7;color:#475569;';
  disclosure.textContent = '※ Luqevoraのランキング・診断結果は、アフィリエイト報酬の有無や報酬額によって順位・結果が決まるものではありません。';

  card.append(eyebrow, title, body, action, disclosure);
  section.appendChild(card);

  const sources = content.querySelector(':scope > section.sources, :scope > .sources');
  if (sources) sources.insertAdjacentElement('beforebegin', section);
  else content.appendChild(section);
})();
