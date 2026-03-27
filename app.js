/* ============================================
   NYC Budget Explorer — Application Logic
   ============================================ */

(function () {
  'use strict';

  const D = NYC_BUDGET_DATA;
  const YEARS = Object.keys(D.years).map(Number).sort((a, b) => a - b);
  const MIN_YEAR = YEARS[0];
  const MAX_YEAR = YEARS[YEARS.length - 1];

  // ---- Color palettes ----
  const EXP_COLORS = {
    education:   '#7b8f6b',
    police:      '#6b7a8f',
    fire:        '#b87d5a',
    welfare:     '#8f6b7a',
    health:      '#6b8f8a',
    debtService: '#9a8b6b',
    pension:     '#7a6b8f',
    sanitation:  '#6b8f6b',
    higherEd:    '#5a7a8f',
    corrections: '#8f7a6b',
    housing:     '#8f6b6b',
    parks:       '#6b9a6b',
    transport:   '#6b6b8f',
    other:       '#8f8a7a'
  };

  const REV_COLORS = {
    propertyTax:  '#5a7a8f',
    incomeTax:    '#6b8f7a',
    salesTax:     '#7a6b8f',
    businessTax:  '#8f7a5a',
    stateAid:     '#5a8f6b',
    federalAid:   '#6b5a8f',
    otherTax:     '#8f8a6b',
    fees:         '#6b8f8f',
    other:        '#8f5a5a'
  };

  const EXP_LABELS = {
    education: 'Education (K-12)',
    police: 'Police',
    fire: 'Fire',
    welfare: 'Social Services / Welfare',
    health: 'Health & Hospitals',
    debtService: 'Debt Service',
    pension: 'Pensions',
    sanitation: 'Sanitation / Environment',
    higherEd: 'Higher Education (CUNY)',
    corrections: 'Corrections',
    housing: 'Housing',
    parks: 'Parks',
    transport: 'Transportation',
    other: 'Other'
  };

  const REV_LABELS = {
    propertyTax: 'Property Tax',
    incomeTax: 'Personal Income Tax',
    salesTax: 'Sales Tax',
    businessTax: 'Business Taxes',
    stateAid: 'State Aid',
    federalAid: 'Federal Aid',
    otherTax: 'Other Taxes',
    fees: 'Fees & Fines',
    other: 'Other Revenue'
  };

  // ---- State ----
  let inflationAdjust = false;
  let charts = {};
  let activeView = 'overview';
  let chartModes = {
    overview: 'area',
    expenditures: 'stacked-area',
    revenue: 'stacked-area',
    compare: 'side-by-side'
  };

  // ---- Helpers ----
  function adj(amount, year) {
    if (!inflationAdjust || !amount) return amount;
    const cpi = D.cpi[year] || D.cpi[MAX_YEAR];
    return amount * (D.cpiBase / cpi);
  }

  function fmt(n) {
    if (n == null) return '—';
    if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1) + 'B';
    return '$' + n.toFixed(0) + 'M';
  }

  function fmtTable(n) {
    if (n == null || n === 0) return '—';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2);
    return n.toFixed(1);
  }

  function pctChange(a, b) {
    if (!a || a === 0) return null;
    return ((b - a) / a) * 100;
  }

  function sumObj(obj) {
    return Object.values(obj).reduce((s, v) => s + (v || 0), 0);
  }

  function getExpTotal(year) {
    const y = D.years[year];
    return y ? sumObj(y.expenditures) : 0;
  }

  function getRevTotal(year) {
    const y = D.years[year];
    return y ? sumObj(y.revenue) : 0;
  }

  function getMayor(year) {
    for (let i = D.mayors.length - 1; i >= 0; i--) {
      if (year >= D.mayors[i].start && year <= D.mayors[i].end) return D.mayors[i];
    }
    return null;
  }

  function alpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---- Chart.js defaults ----
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#6b6b6f';
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = '#2c2c2e';
  Chart.defaults.plugins.tooltip.titleFont = { family: "'Inter', sans-serif", size: 12, weight: 600 };
  Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace", size: 11 };
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxPadding = 4;
  Chart.defaults.elements.point.radius = 0;
  Chart.defaults.elements.point.hoverRadius = 4;
  Chart.defaults.elements.line.tension = 0.3;
  Chart.defaults.elements.line.borderWidth = 2;
  Chart.defaults.scales.linear.grid = { color: '#eeece8' };
  Chart.defaults.scales.category.grid = { display: false };

  // ---- Mayor Bar ----
  function renderMayorBar() {
    const bar = document.getElementById('mayor-bar');
    bar.innerHTML = '';
    const totalYears = MAX_YEAR - MIN_YEAR + 1;
    const partyColors = { D: '#5a7a8f', R: '#8f6b6b', 'R/I': '#7a6b8f', 'R/Liberal': '#6b8f8a', 'R (Fusion)': '#8f8a6b' };

    D.mayors.forEach(m => {
      const s = Math.max(m.start, MIN_YEAR);
      const e = Math.min(m.end, MAX_YEAR);
      if (e < s) return;
      const span = e - s + 1;
      const pct = (span / totalYears) * 100;
      const seg = document.createElement('div');
      seg.className = 'mayor-segment';
      seg.style.width = pct + '%';
      seg.style.background = partyColors[m.party] || '#8f8a7a';
      seg.title = `${m.name} (${m.start}–${m.end})`;
      if (pct > 3) seg.textContent = m.name.split(' ').pop();
      bar.appendChild(seg);
    });
  }

  // ---- Overview Chart ----
  function renderOverview() {
    if (charts.overview) charts.overview.destroy();
    const mode = chartModes.overview;

    const labels = YEARS;
    const expData = labels.map(y => adj(getExpTotal(y), y));
    const revData = labels.map(y => adj(getRevTotal(y), y));

    const isArea = mode === 'area';
    const isBar = mode === 'bar';

    const datasets = [
      {
        label: 'Revenue',
        data: revData,
        borderColor: '#5a7a6b',
        backgroundColor: isArea ? alpha('#5a7a6b', 0.15) : alpha('#5a7a6b', 0.7),
        fill: isArea,
        type: isBar ? 'bar' : 'line',
        order: 1
      },
      {
        label: 'Expenditure',
        data: expData,
        borderColor: '#8f5a5a',
        backgroundColor: isArea ? alpha('#8f5a5a', 0.15) : alpha('#8f5a5a', 0.7),
        fill: isArea,
        type: isBar ? 'bar' : 'line',
        order: 2
      }
    ];

    const ctx = document.getElementById('overview-chart').getContext('2d');
    charts.overview = new Chart(ctx, {
      type: isBar ? 'bar' : 'line',
      data: { labels: labels.map(String), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 25,
              callback: function(val, i) {
                const yr = labels[i];
                return yr % 10 === 0 ? yr : '';
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => fmt(v)
            },
            title: {
              display: true,
              text: inflationAdjust ? 'Millions (2024 dollars)' : 'Millions (nominal)',
              font: { size: 11, weight: 500 }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: items => 'FY ' + items[0].label,
              afterTitle: items => {
                const m = getMayor(parseInt(items[0].label));
                return m ? `Mayor: ${m.name}` : '';
              },
              label: item => `${item.dataset.label}: ${fmt(item.raw)}`
            }
          }
        }
      }
    });

    // Annotations
    renderAnnotations();
  }

  function renderAnnotations() {
    const container = document.getElementById('overview-annotations');
    container.innerHTML = '';
    Object.entries(D.annotations).forEach(([yr, text]) => {
      const chip = document.createElement('span');
      chip.className = 'annotation-chip';
      chip.innerHTML = `<span class="dot"></span>${yr}: ${text}`;
      container.appendChild(chip);
    });
  }

  // ---- Expenditure Chart ----
  function renderExpenditures() {
    if (charts.expenditures) charts.expenditures.destroy();
    const mode = chartModes.expenditures;
    const isPct = mode === 'pct';
    const isStacked = mode === 'stacked-area' || mode === 'stacked-bar' || isPct;
    const isBar = mode === 'stacked-bar';

    const cats = Object.keys(EXP_COLORS);
    const labels = YEARS;

    const datasets = cats.map(cat => {
      const rawData = labels.map(y => {
        const v = adj(D.years[y]?.expenditures?.[cat] || 0, y);
        return v;
      });
      let data = rawData;
      if (isPct) {
        data = labels.map((y, i) => {
          const total = adj(getExpTotal(y), y);
          return total > 0 ? (rawData[i] / total) * 100 : 0;
        });
      }
      return {
        label: EXP_LABELS[cat],
        data,
        borderColor: EXP_COLORS[cat],
        backgroundColor: isStacked || isBar ? alpha(EXP_COLORS[cat], 0.75) : alpha(EXP_COLORS[cat], 0.1),
        fill: isStacked && !isBar,
        borderWidth: isBar ? 0 : (isStacked ? 1 : 2),
        stack: isStacked ? 'stack' : undefined,
        type: isBar ? 'bar' : 'line',
        pointRadius: 0,
        order: cats.indexOf(cat)
      };
    });

    const ctx = document.getElementById('expenditure-chart').getContext('2d');
    charts.expenditures = new Chart(ctx, {
      type: isBar ? 'bar' : 'line',
      data: { labels: labels.map(String), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            stacked: isStacked,
            ticks: {
              maxTicksLimit: 25,
              callback: (v, i) => labels[i] % 10 === 0 ? labels[i] : ''
            }
          },
          y: {
            stacked: isStacked,
            beginAtZero: true,
            ticks: {
              callback: v => isPct ? v.toFixed(0) + '%' : fmt(v)
            },
            max: isPct ? 100 : undefined,
            title: {
              display: true,
              text: isPct ? '% of Total' : (inflationAdjust ? 'Millions (2024 $)' : 'Millions (nominal)'),
              font: { size: 11, weight: 500 }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: items => 'FY ' + items[0].label,
              label: item => {
                const v = item.raw;
                return `${item.dataset.label}: ${isPct ? v.toFixed(1) + '%' : fmt(v)}`;
              }
            }
          }
        }
      }
    });

    renderLegend('expenditure-legend', cats, EXP_LABELS, EXP_COLORS, 'expenditures');
  }

  // ---- Revenue Chart ----
  function renderRevenue() {
    if (charts.revenue) charts.revenue.destroy();
    const mode = chartModes.revenue;
    const isPct = mode === 'pct';
    const isStacked = mode === 'stacked-area' || mode === 'stacked-bar' || isPct;
    const isBar = mode === 'stacked-bar';

    const cats = Object.keys(REV_COLORS);
    const labels = YEARS;

    const datasets = cats.map(cat => {
      const rawData = labels.map(y => adj(D.years[y]?.revenue?.[cat] || 0, y));
      let data = rawData;
      if (isPct) {
        data = labels.map((y, i) => {
          const total = adj(getRevTotal(y), y);
          return total > 0 ? (rawData[i] / total) * 100 : 0;
        });
      }
      return {
        label: REV_LABELS[cat],
        data,
        borderColor: REV_COLORS[cat],
        backgroundColor: isStacked || isBar ? alpha(REV_COLORS[cat], 0.75) : alpha(REV_COLORS[cat], 0.1),
        fill: isStacked && !isBar,
        borderWidth: isBar ? 0 : (isStacked ? 1 : 2),
        stack: isStacked ? 'stack' : undefined,
        type: isBar ? 'bar' : 'line',
        pointRadius: 0
      };
    });

    const ctx = document.getElementById('revenue-chart').getContext('2d');
    charts.revenue = new Chart(ctx, {
      type: isBar ? 'bar' : 'line',
      data: { labels: labels.map(String), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            stacked: isStacked,
            ticks: {
              maxTicksLimit: 25,
              callback: (v, i) => labels[i] % 10 === 0 ? labels[i] : ''
            }
          },
          y: {
            stacked: isStacked,
            beginAtZero: true,
            ticks: {
              callback: v => isPct ? v.toFixed(0) + '%' : fmt(v)
            },
            max: isPct ? 100 : undefined,
            title: {
              display: true,
              text: isPct ? '% of Total' : (inflationAdjust ? 'Millions (2024 $)' : 'Millions (nominal)'),
              font: { size: 11, weight: 500 }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: items => 'FY ' + items[0].label,
              label: item => {
                const v = item.raw;
                return `${item.dataset.label}: ${isPct ? v.toFixed(1) + '%' : fmt(v)}`;
              }
            }
          }
        }
      }
    });

    renderLegend('revenue-legend', cats, REV_LABELS, REV_COLORS, 'revenue');
  }

  // ---- Legend ----
  function renderLegend(containerId, cats, labels, colors, chartKey) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    cats.forEach(cat => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      item.innerHTML = `<span class="legend-dot" style="background:${colors[cat]}"></span>${labels[cat]}`;
      item.addEventListener('click', () => {
        const chart = charts[chartKey];
        if (!chart) return;
        const dsIndex = cats.indexOf(cat);
        const meta = chart.getDatasetMeta(dsIndex);
        meta.hidden = !meta.hidden;
        item.classList.toggle('muted');
        chart.update();
      });
      container.appendChild(item);
    });
  }

  // ---- Compare View ----
  function initCompare() {
    const selA = document.getElementById('compare-year-a');
    const selB = document.getElementById('compare-year-b');
    selA.innerHTML = '';
    selB.innerHTML = '';
    YEARS.forEach(y => {
      selA.add(new Option(y, y));
      selB.add(new Option(y, y));
    });
    selA.value = '1975';
    selB.value = '2024';
    selA.addEventListener('change', renderCompare);
    selB.addEventListener('change', renderCompare);
  }

  function renderCompare() {
    const yearA = parseInt(document.getElementById('compare-year-a').value);
    const yearB = parseInt(document.getElementById('compare-year-b').value);
    const mode = chartModes.compare;
    const dataA = D.years[yearA];
    const dataB = D.years[yearB];
    if (!dataA || !dataB) return;

    // Expenditure comparison
    if (charts.compareExp) charts.compareExp.destroy();
    if (charts.compareRev) charts.compareRev.destroy();

    const expCats = Object.keys(EXP_LABELS);
    const revCats = Object.keys(REV_LABELS);

    if (mode === 'side-by-side' || mode === 'overlay') {
      // Side-by-side bar charts
      const expLabels = expCats.map(c => EXP_LABELS[c]);
      const revLabels = revCats.map(c => REV_LABELS[c]);

      const expDataA = expCats.map(c => adj(dataA.expenditures[c] || 0, yearA));
      const expDataB = expCats.map(c => adj(dataB.expenditures[c] || 0, yearB));
      const revDataA = revCats.map(c => adj(dataA.revenue[c] || 0, yearA));
      const revDataB = revCats.map(c => adj(dataB.revenue[c] || 0, yearB));

      charts.compareExp = new Chart(document.getElementById('compare-exp-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: expLabels,
          datasets: [
            { label: String(yearA), data: expDataA, backgroundColor: alpha('#5a7a8f', 0.7), borderRadius: 3 },
            { label: String(yearB), data: expDataB, backgroundColor: alpha('#8f5a5a', 0.7), borderRadius: 3 }
          ]
        },
        options: compareBarOptions('Expenditures')
      });

      charts.compareRev = new Chart(document.getElementById('compare-rev-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: revLabels,
          datasets: [
            { label: String(yearA), data: revDataA, backgroundColor: alpha('#5a7a8f', 0.7), borderRadius: 3 },
            { label: String(yearB), data: revDataB, backgroundColor: alpha('#8f5a5a', 0.7), borderRadius: 3 }
          ]
        },
        options: compareBarOptions('Revenue')
      });
    } else {
      // Delta mode — show percentage change
      const expDeltas = expCats.map(c => {
        const a = adj(dataA.expenditures[c] || 0, yearA);
        const b = adj(dataB.expenditures[c] || 0, yearB);
        return pctChange(a, b);
      });
      const revDeltas = revCats.map(c => {
        const a = adj(dataA.revenue[c] || 0, yearA);
        const b = adj(dataB.revenue[c] || 0, yearB);
        return pctChange(a, b);
      });

      const deltaColors = vals => vals.map(v => v != null && v >= 0 ? alpha('#8f5a5a', 0.7) : alpha('#5a7a6b', 0.7));

      charts.compareExp = new Chart(document.getElementById('compare-exp-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: expCats.map(c => EXP_LABELS[c]),
          datasets: [{
            label: '% Change',
            data: expDeltas.map(d => d ?? 0),
            backgroundColor: deltaColors(expDeltas),
            borderRadius: 3
          }]
        },
        options: deltaBarOptions(`Expenditure Change: ${yearA} → ${yearB}`)
      });

      charts.compareRev = new Chart(document.getElementById('compare-rev-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: revCats.map(c => REV_LABELS[c]),
          datasets: [{
            label: '% Change',
            data: revDeltas.map(d => d ?? 0),
            backgroundColor: deltaColors(revDeltas),
            borderRadius: 3
          }]
        },
        options: deltaBarOptions(`Revenue Change: ${yearA} → ${yearB}`)
      });
    }

    // Summary
    renderCompareSummary(yearA, yearB, dataA, dataB);
  }

  function compareBarOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: v => fmt(v) },
          title: { display: true, text: inflationAdjust ? '2024 dollars (millions)' : 'Nominal dollars (millions)', font: { size: 10 } }
        },
        y: {
          ticks: { font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: item => `${item.dataset.label}: ${fmt(item.raw)}`
          }
        }
      }
    };
  }

  function deltaBarOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          ticks: { callback: v => v.toFixed(0) + '%' }
        },
        y: {
          ticks: { font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: item => (item.raw >= 0 ? '+' : '') + item.raw.toFixed(1) + '%'
          }
        }
      }
    };
  }

  function renderCompareSummary(yearA, yearB, dataA, dataB) {
    const container = document.getElementById('compare-summary');
    const totalExpA = adj(getExpTotal(yearA), yearA);
    const totalExpB = adj(getExpTotal(yearB), yearB);
    const totalRevA = adj(getRevTotal(yearA), yearA);
    const totalRevB = adj(getRevTotal(yearB), yearB);

    const expPct = pctChange(totalExpA, totalExpB);
    const revPct = pctChange(totalRevA, totalRevB);

    const mayorA = getMayor(yearA);
    const mayorB = getMayor(yearB);

    const suffix = inflationAdjust ? ' (inflation-adjusted)' : ' (nominal)';
    const expDir = expPct >= 0 ? 'up' : 'down';
    const revDir = revPct >= 0 ? 'up' : 'down';

    container.innerHTML = `
      <strong>${yearA}</strong> (${mayorA ? mayorA.name : '—'}) vs. <strong>${yearB}</strong> (${mayorB ? mayorB.name : '—'})${suffix}<br>
      Total expenditures: <span class="stat">${fmt(totalExpA)}</span> → <span class="stat">${fmt(totalExpB)}</span>
      (<span class="stat ${expDir}">${expPct >= 0 ? '+' : ''}${expPct?.toFixed(1) ?? '—'}%</span>)<br>
      Total revenue: <span class="stat">${fmt(totalRevA)}</span> → <span class="stat">${fmt(totalRevB)}</span>
      (<span class="stat ${revDir}">${revPct >= 0 ? '+' : ''}${revPct?.toFixed(1) ?? '—'}%</span>)
    `;
  }

  // ---- Timeline View ----
  function initTimeline() {
    const slider = document.getElementById('timeline-slider');
    slider.min = MIN_YEAR;
    slider.max = MAX_YEAR;
    slider.value = 1975;

    slider.addEventListener('input', () => {
      renderTimeline(parseInt(slider.value));
    });

    document.getElementById('timeline-prev').addEventListener('click', () => {
      const v = Math.max(MIN_YEAR, parseInt(slider.value) - 1);
      slider.value = v;
      renderTimeline(v);
    });

    document.getElementById('timeline-next').addEventListener('click', () => {
      const v = Math.min(MAX_YEAR, parseInt(slider.value) + 1);
      slider.value = v;
      renderTimeline(v);
    });

    // Keyboard support
    document.addEventListener('keydown', e => {
      if (activeView !== 'timeline') return;
      if (e.key === 'ArrowLeft') {
        const v = Math.max(MIN_YEAR, parseInt(slider.value) - 1);
        slider.value = v;
        renderTimeline(v);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        const v = Math.min(MAX_YEAR, parseInt(slider.value) + 1);
        slider.value = v;
        renderTimeline(v);
        e.preventDefault();
      }
    });
  }

  function renderTimeline(year) {
    document.getElementById('timeline-year').textContent = year;

    const mayor = getMayor(year);
    document.getElementById('timeline-mayor').textContent = mayor
      ? `Mayor ${mayor.name} (${mayor.party}, ${mayor.start}–${mayor.end})`
      : '';

    const data = D.years[year];
    if (!data) return;

    // Expenditure donut
    if (charts.timelineExp) charts.timelineExp.destroy();
    const expCats = Object.keys(EXP_LABELS);
    const expVals = expCats.map(c => adj(data.expenditures[c] || 0, year));
    const expNonZero = expCats.filter((c, i) => expVals[i] > 0.5);
    const expValsFiltered = expNonZero.map(c => adj(data.expenditures[c] || 0, year));

    charts.timelineExp = new Chart(document.getElementById('timeline-exp-chart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: expNonZero.map(c => EXP_LABELS[c]),
        datasets: [{
          data: expValsFiltered,
          backgroundColor: expNonZero.map(c => EXP_COLORS[c]),
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '45%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: item => `${item.label}: ${fmt(item.raw)} (${((item.raw / expValsFiltered.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
            }
          },
          title: {
            display: true,
            text: 'Expenditures',
            font: { size: 13, weight: 600 },
            color: '#2c2c2e'
          }
        }
      }
    });

    // Revenue donut
    if (charts.timelineRev) charts.timelineRev.destroy();
    const revCats = Object.keys(REV_LABELS);
    const revVals = revCats.map(c => adj(data.revenue[c] || 0, year));
    const revNonZero = revCats.filter((c, i) => revVals[i] > 0.5);
    const revValsFiltered = revNonZero.map(c => adj(data.revenue[c] || 0, year));

    charts.timelineRev = new Chart(document.getElementById('timeline-rev-chart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: revNonZero.map(c => REV_LABELS[c]),
        datasets: [{
          data: revValsFiltered,
          backgroundColor: revNonZero.map(c => REV_COLORS[c]),
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '45%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: item => `${item.label}: ${fmt(item.raw)} (${((item.raw / revValsFiltered.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
            }
          },
          title: {
            display: true,
            text: 'Revenue',
            font: { size: 13, weight: 600 },
            color: '#2c2c2e'
          }
        }
      }
    });

    // Totals
    const totalExp = adj(getExpTotal(year), year);
    const totalRev = adj(getRevTotal(year), year);
    const balance = totalRev - totalExp;
    const balanceLabel = balance >= 0 ? 'Surplus' : 'Deficit';
    const balanceClass = balance >= 0 ? 'surplus' : 'deficit';

    document.getElementById('timeline-totals').innerHTML = `
      <div class="total-item">
        <div class="total-label">Total Revenue</div>
        <div class="total-value rev">${fmt(totalRev)}</div>
      </div>
      <div class="total-item">
        <div class="total-label">Total Expenditure</div>
        <div class="total-value exp">${fmt(totalExp)}</div>
      </div>
      <div class="total-item">
        <div class="total-label">${balanceLabel}</div>
        <div class="total-value ${balanceClass}">${fmt(Math.abs(balance))}</div>
      </div>
    `;

    // Context
    const annotation = D.annotations[year];
    const ctx = document.getElementById('timeline-context');
    if (annotation) {
      ctx.style.display = 'block';
      ctx.textContent = annotation;
    } else {
      ctx.style.display = 'none';
    }
  }

  // ---- Data Table ----
  function renderTable() {
    const category = document.getElementById('table-category').value;
    const yearFrom = parseInt(document.getElementById('table-year-from').value);
    const yearTo = parseInt(document.getElementById('table-year-to').value);

    const years = YEARS.filter(y => y >= yearFrom && y <= yearTo);
    if (years.length === 0) return;

    // Determine step to avoid huge tables
    let step = 1;
    if (years.length > 50) step = 5;
    if (years.length > 100) step = 10;
    const displayYears = years.filter((y, i) => i === 0 || i === years.length - 1 || y % step === 0);

    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');

    // Header
    thead.innerHTML = '<tr><th>Category</th>' + displayYears.map(y => `<th>${y}</th>`).join('') + '</tr>';

    let rows = '';

    if (category === 'all' || category === 'expenditures' || category === 'totals') {
      if (category !== 'totals') {
        rows += `<tr class="row-header"><td colspan="${displayYears.length + 1}">Expenditures</td></tr>`;
        Object.keys(EXP_LABELS).forEach(cat => {
          const vals = displayYears.map(y => adj(D.years[y]?.expenditures?.[cat] || 0, y));
          if (vals.some(v => v > 0)) {
            rows += '<tr><td>' + EXP_LABELS[cat] + '</td>' + vals.map(v => `<td>${fmtTable(v)}</td>`).join('') + '</tr>';
          }
        });
      }
      rows += '<tr class="row-total"><td>Total Expenditures</td>' +
        displayYears.map(y => `<td>${fmtTable(adj(getExpTotal(y), y))}</td>`).join('') + '</tr>';
    }

    if (category === 'all' || category === 'revenue' || category === 'totals') {
      if (category !== 'totals') {
        rows += `<tr class="row-header"><td colspan="${displayYears.length + 1}">Revenue</td></tr>`;
        Object.keys(REV_LABELS).forEach(cat => {
          const vals = displayYears.map(y => adj(D.years[y]?.revenue?.[cat] || 0, y));
          if (vals.some(v => v > 0)) {
            rows += '<tr><td>' + REV_LABELS[cat] + '</td>' + vals.map(v => `<td>${fmtTable(v)}</td>`).join('') + '</tr>';
          }
        });
      }
      rows += '<tr class="row-total"><td>Total Revenue</td>' +
        displayYears.map(y => `<td>${fmtTable(adj(getRevTotal(y), y))}</td>`).join('') + '</tr>';
    }

    tbody.innerHTML = rows;
  }

  function initTable() {
    const selFrom = document.getElementById('table-year-from');
    const selTo = document.getElementById('table-year-to');
    selFrom.innerHTML = '';
    selTo.innerHTML = '';
    YEARS.forEach(y => {
      selFrom.add(new Option(y, y));
      selTo.add(new Option(y, y));
    });
    selFrom.value = MIN_YEAR;
    selTo.value = MAX_YEAR;
    selFrom.addEventListener('change', renderTable);
    selTo.addEventListener('change', renderTable);
    document.getElementById('table-category').addEventListener('change', renderTable);
  }

  // ---- Navigation ----
  function switchView(view) {
    activeView = view;
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));

    // Render on switch (charts need visible container)
    requestAnimationFrame(() => {
      switch (view) {
        case 'overview': renderOverview(); break;
        case 'expenditures': renderExpenditures(); break;
        case 'revenue': renderRevenue(); break;
        case 'compare': renderCompare(); break;
        case 'timeline': renderTimeline(parseInt(document.getElementById('timeline-slider').value)); break;
        case 'table': renderTable(); break;
      }
    });
  }

  // ---- Chart mode toggles ----
  function initChartToggles() {
    document.querySelectorAll('.view').forEach(viewEl => {
      const viewId = viewEl.id.replace('view-', '');
      viewEl.querySelectorAll('.chart-type-toggle .chart-btn, .compare-mode-toggle .chart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const parent = btn.parentElement;
          parent.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          chartModes[viewId] = btn.dataset.chart;

          switch (viewId) {
            case 'overview': renderOverview(); break;
            case 'expenditures': renderExpenditures(); break;
            case 'revenue': renderRevenue(); break;
            case 'compare': renderCompare(); break;
          }
        });
      });
    });
  }

  // ---- Inflation toggle ----
  function initInflationToggle() {
    document.getElementById('inflation-toggle').addEventListener('change', e => {
      inflationAdjust = e.target.checked;
      // Re-render current view
      switchView(activeView);
    });
  }

  // ---- Init ----
  function init() {
    renderMayorBar();
    initCompare();
    initTimeline();
    initTable();
    initChartToggles();
    initInflationToggle();

    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // Initial render
    renderOverview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
