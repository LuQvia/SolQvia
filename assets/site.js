(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const filters = document.querySelectorAll('.filter-button[data-category]');
  const cards = document.querySelectorAll('[data-card-category]');
  if (filters.length && cards.length) {
    const params = new URLSearchParams(location.search);
    const requested = params.get('category') || 'all';
    const apply = (category) => {
      filters.forEach((button) => button.classList.toggle('active', button.dataset.category === category));
      cards.forEach((card) => { card.hidden = category !== 'all' && card.dataset.cardCategory !== category; });
    };
    apply([...filters].some((button) => button.dataset.category === requested) ? requested : 'all');
    filters.forEach((button) => button.addEventListener('click', () => apply(button.dataset.category)));
  }

  const calculator = document.querySelector('.calculator[data-tool]');
  if (!calculator) return;

  const ja = calculator.dataset.locale === 'ja';
  const locale = ja ? 'ja-JP' : 'en-US';
  const el = (id) => document.getElementById(id);
  const value = (id) => el(id)?.value ?? '';
  const number = (id) => Number(value(id) || 0);
  const checked = (id) => Boolean(el(id)?.checked);
  const fmt = (v, digits = 2) => Number.isFinite(v) ? new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v) : '—';
  const percent = (v) => Number.isFinite(v) ? `${fmt(v, 2)}%` : '—';
  const set = (id, output) => {
    const node = el(id);
    if (!node) return;
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) node.value = String(output);
    else node.textContent = String(output);
  };
  const message = (jaText, enText) => ja ? jaText : enText;
  const parseDate = (text) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const isoDate = (date) => date.toISOString().slice(0, 10);
  const dayMs = 86400000;
  const lastDay = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const addCalendar = (date, years, months, days) => {
    const totalMonth = date.getUTCMonth() + months;
    const targetYear = date.getUTCFullYear() + years + Math.floor(totalMonth / 12);
    const targetMonth = ((totalMonth % 12) + 12) % 12;
    const targetDay = Math.min(date.getUTCDate(), lastDay(targetYear, targetMonth));
    const result = new Date(Date.UTC(targetYear, targetMonth, targetDay));
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  };
  const calendarSpan = (a, b) => {
    let start = a; let end = b;
    if (start > end) [start, end] = [end, start];
    let years = end.getUTCFullYear() - start.getUTCFullYear();
    let anchor = addCalendar(start, years, 0, 0);
    if (anchor > end) { years -= 1; anchor = addCalendar(start, years, 0, 0); }
    let months = 0;
    while (months < 11 && addCalendar(anchor, 0, months + 1, 0) <= end) months += 1;
    anchor = addCalendar(anchor, 0, months, 0);
    const days = Math.round((end - anchor) / dayMs);
    return { years, months, days };
  };
  const utf8ToBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  };
  const base64ToUtf8 = (text) => {
    const binary = atob(text.replace(/\s+/g, ''));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  };
  const secureRandomString = (length, charset) => {
    if (!length || !charset.length) return '';
    const limit = 256 - (256 % charset.length);
    let result = '';
    while (result.length < length) {
      const bytes = new Uint8Array(Math.max(16, length - result.length));
      crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte < limit) result += charset[byte % charset.length];
        if (result.length === length) break;
      }
    }
    return result;
  };
  const srgb = (channel) => {
    const x = channel / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const clean = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  };
  const parseCsv = (text) => {
    const rows = []; let row = []; let cell = ''; let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    return rows;
  };

  const calculate = () => {
    const tool = calculator.dataset.tool;
    try {
      if (tool === 'ad') set('revenue', fmt(number('pageviews') / 1000 * number('rpm')));
      else if (tool === 'gross') {
        const revenue = number('revenue'); const gross = revenue - number('cost');
        set('grossProfit', fmt(gross)); set('grossMargin', revenue ? percent(gross / revenue * 100) : '—');
      } else if (tool === 'labor') {
        const revenue = number('revenue'); set('laborRatio', revenue ? percent(number('laborCost') / revenue * 100) : '—');
      } else if (tool === 'breakeven') {
        const rate = number('variableRate') / 100; set('breakEven', rate >= 1 ? '—' : fmt(number('fixedCost') / (1 - rate)));
      } else if (tool === 'tax') {
        const amount = number('amount'); const rate = number('taxRate') / 100; const inclusive = value('taxMode') === 'inclusive';
        const exclusiveValue = inclusive ? amount / (1 + rate) : amount; const inclusiveValue = inclusive ? amount : amount * (1 + rate);
        set('taxExclusive', fmt(exclusiveValue)); set('taxInclusive', fmt(inclusiveValue)); set('taxAmount', fmt(inclusiveValue - exclusiveValue));
      } else if (tool === 'age') {
        const birth = parseDate(value('birthDate')); const ref = parseDate(value('referenceDate')); if (!birth || !ref || birth > ref) throw new Error(message('日付を確認してください。', 'Check the dates.'));
        let age = ref.getUTCFullYear() - birth.getUTCFullYear();
        const birthdayThisYear = addCalendar(birth, age, 0, 0); if (birthdayThisYear > ref) age -= 1;
        let next = addCalendar(birth, age + 1, 0, 0); if (next <= ref) next = addCalendar(birth, age + 2, 0, 0);
        set('ageYears', message(`${age}歳`, `${age} years`)); set('nextBirthday', message(`${Math.ceil((next - ref) / dayMs)}日`, `${Math.ceil((next - ref) / dayMs)} days`));
      } else if (tool === 'date-diff') {
        const a = parseDate(value('startDate')); const b = parseDate(value('endDate')); if (!a || !b) throw new Error(message('日付を確認してください。', 'Check the dates.'));
        const raw = Math.abs(Math.round((b - a) / dayMs)); const days = raw + (checked('inclusive') ? 1 : 0); const span = calendarSpan(a, b);
        set('differenceDays', message(`${days}日`, `${days} days`)); set('differenceWeeks', message(`${Math.floor(days / 7)}週 ${days % 7}日`, `${Math.floor(days / 7)} weeks ${days % 7} days`));
        set('calendarSpan', message(`${span.years}年 ${span.months}か月 ${span.days}日`, `${span.years} years ${span.months} months ${span.days} days`));
      } else if (tool === 'date-add') {
        const base = parseDate(value('baseDate')); if (!base) throw new Error(message('日付を確認してください。', 'Check the date.'));
        set('calculatedDate', isoDate(addCalendar(base, number('addYears'), number('addMonths'), number('addDays'))));
      } else if (tool === 'percentage') {
        const whole = number('whole'); set('partPercent', whole ? percent(number('part') / whole * 100) : '—'); set('percentageAmount', fmt(number('baseValue') * number('rate') / 100));
      } else if (tool === 'percent-change') {
        const oldValue = number('oldValue'); const change = number('newValue') - oldValue; set('absoluteChange', fmt(change)); set('percentChange', oldValue ? percent(change / oldValue * 100) : '—');
      } else if (tool === 'discount') {
        const original = number('originalPrice'); const saving = original * number('discountRate') / 100; const before = original - saving; const after = before * (1 + number('discountTaxRate') / 100);
        set('discountAmount', fmt(saving)); set('discountedBeforeTax', fmt(before)); set('discountedAfterTax', fmt(after));
      } else if (tool === 'loan') {
        const principal = number('loanPrincipal'); const months = Math.max(1, Math.round(number('loanMonths'))); const monthlyRate = number('annualRate') / 1200;
        const payment = monthlyRate ? principal * monthlyRate / (1 - (1 + monthlyRate) ** -months) : principal / months; const total = payment * months;
        set('monthlyPayment', fmt(payment)); set('totalPayment', fmt(total)); set('totalInterest', fmt(total - principal));
      } else if (tool === 'compound') {
        const principal = number('compoundPrincipal'); const contribution = number('monthlyContribution'); const months = Math.max(0, Math.round(number('compoundYears') * 12)); const r = number('compoundRate') / 1200;
        const principalFuture = principal * (1 + r) ** months; const annuity = r ? contribution * (((1 + r) ** months - 1) / r) : contribution * months; const future = principalFuture + annuity; const total = principal + contribution * months;
        set('futureValue', fmt(future)); set('totalContributions', fmt(total)); set('investmentGain', fmt(future - total));
      } else if (tool === 'unit') {
        const from = value('fromUnit').split(':'); const to = value('toUnit').split(':'); if (from[0] !== to[0]) throw new Error(message('同じ種類の単位を選んでください。', 'Choose units from the same category.'));
        const factors = { length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 }, mass: { g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237 }, volume: { ml: 0.001, l: 1, cup: 0.2365882365 } };
        let result;
        if (from[0] === 'temp') result = from[1] === to[1] ? number('unitValue') : from[1] === 'c' ? number('unitValue') * 9 / 5 + 32 : (number('unitValue') - 32) * 5 / 9;
        else result = number('unitValue') * factors[from[0]][from[1]] / factors[to[0]][to[1]];
        set('convertedValue', fmt(result, 8));
      } else if (tool === 'timezone') {
        const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value('timeInput')); if (!match) throw new Error(message('日時を確認してください。', 'Check the date and time.'));
        const utc = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]) - number('fromOffset') * 3600000; const target = new Date(utc + number('toOffset') * 3600000);
        set('convertedTime', target.toISOString().slice(0, 16).replace('T', ' '));
      } else if (tool === 'workdays') {
        let start = parseDate(value('workStart')); let end = parseDate(value('workEnd')); if (!start || !end) throw new Error(message('日付を確認してください。', 'Check the dates.')); if (start > end) [start, end] = [end, start];
        const holidaySet = new Set(value('holidays').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)); let business = 0; let total = 0;
        for (let current = new Date(start); current <= end; current = new Date(current.getTime() + dayMs)) { total += 1; const day = current.getUTCDay(); if (day !== 0 && day !== 6 && !holidaySet.has(isoDate(current))) business += 1; }
        set('businessDays', message(`${business}日`, `${business} days`)); set('calendarDays', message(`${total}日`, `${total} days`));
      } else if (tool === 'word-count') {
        const text = value('countText'); const chars = Array.from(text).length; const noSpace = Array.from(text.replace(/\s/gu, '')).length; let words = 0;
        if (Intl.Segmenter) { const segmenter = new Intl.Segmenter(ja ? 'ja' : 'en', { granularity: 'word' }); words = [...segmenter.segment(text)].filter((part) => part.isWordLike).length; }
        else words = text.trim() ? text.trim().split(/\s+/).length : 0;
        set('charCount', fmt(chars, 0)); set('nonSpaceCount', fmt(noSpace, 0)); set('wordCount', fmt(words, 0)); set('lineCount', fmt(text ? text.split(/\r?\n/).length : 0, 0));
      } else if (tool === 'case') {
        const text = value('caseText'); const mode = value('caseMode'); let result = text;
        if (mode === 'upper') result = text.toLocaleUpperCase(locale); else if (mode === 'lower') result = text.toLocaleLowerCase(locale);
        else if (mode === 'title') result = text.toLocaleLowerCase(locale).replace(/(^|[\s\-_])([\p{L}\p{N}])/gu, (_, prefix, char) => prefix + char.toLocaleUpperCase(locale));
        else if (mode === 'sentence') result = text.toLocaleLowerCase(locale).replace(/(^\s*|[.!?]\s+)([\p{L}])/gu, (_, prefix, char) => prefix + char.toLocaleUpperCase(locale));
        set('caseOutput', result);
      } else if (tool === 'json') {
        const parsed = JSON.parse(value('jsonInput')); const indent = Number(value('jsonIndent')); set('jsonStatus', message('有効なJSONです。', 'Valid JSON.')); set('jsonOutput', JSON.stringify(parsed, null, indent || 0));
      } else if (tool === 'url') set('urlOutput', value('urlMode') === 'encode' ? encodeURIComponent(value('urlText')) : decodeURIComponent(value('urlText')));
      else if (tool === 'base64') set('base64Output', value('base64Mode') === 'encode' ? utf8ToBase64(value('base64Text')) : base64ToUtf8(value('base64Text')));
      else if (tool === 'uuid') {
        const count = Math.min(100, Math.max(1, Math.round(number('uuidCount')))); const values = [];
        for (let i = 0; i < count; i += 1) values.push(crypto.randomUUID ? crypto.randomUUID() : `${secureRandomString(8, '0123456789abcdef')}-${secureRandomString(4, '0123456789abcdef')}-4${secureRandomString(3, '0123456789abcdef')}-${'89ab'[crypto.getRandomValues(new Uint8Array(1))[0] % 4]}${secureRandomString(3, '0123456789abcdef')}-${secureRandomString(12, '0123456789abcdef')}`);
        set('uuidOutput', values.join('\n'));
      } else if (tool === 'random-string') {
        const sets = { safe: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-', alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', hex: '0123456789abcdef', digits: '0123456789' };
        const length = Math.min(512, Math.max(1, Math.round(number('randomLength')))); const count = Math.min(100, Math.max(1, Math.round(number('randomCount')))); const values = [];
        for (let i = 0; i < count; i += 1) values.push(secureRandomString(length, sets[value('randomCharset')])); set('randomOutput', values.join('\n'));
      } else if (tool === 'contrast') {
        const l1 = luminance(value('foregroundColor')); const l2 = luminance(value('backgroundColor')); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        set('contrastRatio', `${ratio.toFixed(2)}:1`); set('aaNormal', ratio >= 4.5 ? message('適合', 'Pass') : message('不適合', 'Fail')); set('aaLarge', ratio >= 3 ? message('適合', 'Pass') : message('不適合', 'Fail'));
      } else if (tool === 'csv') {
        const rows = parseCsv(value('csvText')); const headers = rows[0] || []; const dataRows = Math.max(0, rows.length - 1); const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
        set('csvRows', fmt(dataRows, 0)); set('csvColumns', fmt(maxColumns, 0)); set('csvHeaders', headers.join(' | ') || '—'); set('csvPreview', rows.slice(0, 6).map((row) => row.join(' | ')).join('\n'));
      }
    } catch (error) {
      const text = `${message('エラー', 'Error')}: ${error.message}`;
      const firstOutput = calculator.querySelector('.calculator-results strong, .calculator-results textarea');
      if (firstOutput) { if (firstOutput instanceof HTMLTextAreaElement) firstOutput.value = text; else firstOutput.textContent = text; }
    }
  };

  calculator.querySelector('.calc-button')?.addEventListener('click', calculate);
  calculator.querySelector('.reset-button')?.addEventListener('click', () => {
    calculator.querySelectorAll('input, textarea, select').forEach((input) => {
      if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = input.defaultChecked;
      else input.value = input.defaultValue;
    });
    calculator.querySelectorAll('.calculator-results strong').forEach((node) => { node.textContent = '—'; });
    calculator.querySelectorAll('.calculator-results textarea').forEach((node) => { node.value = '—'; });
    calculate();
  });
  calculate();
})();
