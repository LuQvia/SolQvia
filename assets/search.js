(() => {
  const lang=window.SOLQVIA_LANG||'en';
  const input=document.querySelector('#search-input'),form=document.querySelector('.search-page-form'),status=document.querySelector('#search-status'),results=document.querySelector('#search-results');
  if(!input||!form||!status||!results)return;
  const cache={};
  const load=async group=>cache[group]||(cache[group]=fetch(`/assets/search-${lang}-${group}.json`).then(r=>{if(!r.ok)throw new Error('search index');return r.json()}));
  const esc=v=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const params=new URLSearchParams(location.search); input.value=params.get('q')||'';
  const run=async()=>{
    const query=input.value.trim().toLowerCase(); history.replaceState(null,'',query?`?q=${encodeURIComponent(query)}`:location.pathname);
    if(!query){status.textContent=lang==='ja'?'検索語を入力してください。':'Enter a search term.';results.innerHTML='';return;}
    status.textContent=lang==='ja'?'検索中…':'Searching…';
    const phoneTerms=/(スマホ|スマートフォン|iphone|android|galaxy|pixel|wifi|wi-fi|sim|esim|通知|充電|battery|bluetooth|phone|mobile|charging|notification)/i;
    const first=phoneTerms.test(query)?['smartphone','core']:['core','smartphone'];
    let index=[...(await load(first[0])),...(await load(first[1]))];
    const terms=query.split(/\s+/).filter(Boolean);
    const scoreRows=rows=>rows.map(item=>{const title=(item.title||'').toLowerCase(),hay=`${item.title||''} ${item.description||''} ${item.text||''}`.toLowerCase();const score=terms.reduce((s,t)=>s+(hay.includes(t)?1:0)+(title.includes(t)?3:0),0);return{item,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    let matches=scoreRows(index);
    if(matches.length<20){index=[...index,...(await load('japan'))];matches=scoreRows(index);}
    matches=matches.slice(0,30);
    status.textContent=lang==='ja'?`${matches.length}件の候補`:`${matches.length} result${matches.length===1?'':'s'}`;
    results.innerHTML=matches.map(({item})=>`<article class="card article-card"><div class="card-kicker">${esc(item.category)}</div><h3><a href="${esc(item.url)}">${esc(item.title)}</a></h3><p>${esc(item.description)}</p><a class="text-link" href="${esc(item.url)}">${lang==='ja'?'開く':'Open'} →</a></article>`).join('');
  };
  form.addEventListener('submit',e=>{e.preventDefault();run().catch(()=>{status.textContent=lang==='ja'?'検索データを読み込めませんでした。':'Search data could not be loaded.'})});
  if(input.value)run();
})();
