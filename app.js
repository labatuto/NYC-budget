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
  Chart.defaults.scales.linear.grid = { color: '#eeece8', drawTicks: false };
  Chart.defaults.scales.category.grid = { display: false };
  Chart.defaults.scales.linear.ticks = { ...Chart.defaults.scales.linear.ticks, padding: 8 };
  Chart.defaults.scales.category.ticks = { ...Chart.defaults.scales.category.ticks, padding: 4 };

  // Register datalabels plugin — disabled by default, enabled per-chart
  Chart.register(ChartDataLabels);
  Chart.defaults.plugins.datalabels = { display: false };

  // Custom plugin: subtle vertical reference lines at annotation years
  const annotationLinesPlugin = {
    id: 'annotationLines',
    afterDraw(chart) {
      const opts = chart.options.plugins?.annotationLines;
      if (!opts?.years) return;
      const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
      ctx.save();
      opts.years.forEach(year => {
        const yearStr = String(year);
        const idx = chart.data.labels.indexOf(yearStr);
        if (idx === -1) return;
        const xPos = x.getPixelForValue(idx);
        if (xPos < left || xPos > right) return;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(44,44,46,0.10)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        // Small tick at bottom
        ctx.beginPath();
        ctx.fillStyle = 'rgba(44,44,46,0.25)';
        ctx.arc(xPos, bottom, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  };
  Chart.register(annotationLinesPlugin);

  // Custom plugin: direct text labels at the end of each line dataset
  const endpointLabelPlugin = {
    id: 'endpointLabels',
    afterDatasetsDraw(chart) {
      if (!chart.options.plugins?.endpointLabels?.display) return;
      const { ctx, chartArea: { right } } = chart;
      ctx.save();
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden || meta.type === 'bar') return;
        const points = meta.data;
        const lastPt = points[points.length - 1];
        if (!lastPt) return;
        const val = ds.data[ds.data.length - 1];
        ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = ds.borderColor || '#2c2c2e';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${ds.label}  ${fmt(val)}`, lastPt.x + 8, lastPt.y);
      });
      ctx.restore();
    }
  };
  Chart.register(endpointLabelPlugin);

  // Custom plugin: center text inside doughnut charts
  const doughnutCenterPlugin = {
    id: 'doughnutCenter',
    afterDraw(chart) {
      const opts = chart.options.plugins?.doughnutCenter;
      if (!opts?.text) return;
      const { ctx, chartArea: { top, bottom, left, right } } = chart;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "700 15px 'JetBrains Mono', monospace";
      ctx.fillStyle = opts.color || '#2c2c2e';
      ctx.fillText(opts.text, centerX, centerY - 7);
      ctx.font = "500 9px 'Inter', sans-serif";
      ctx.fillStyle = '#9a9a9e';
      ctx.fillText(opts.subtext || '', centerX, centerY + 9);
      ctx.restore();
    }
  };
  Chart.register(doughnutCenterPlugin);

  // ---- Mayor Bar ----
  function renderMayorBar() {
    const bar = document.getElementById('mayor-bar');
    bar.innerHTML = '';
    const totalYears = MAX_YEAR - MIN_YEAR + 1;
    const partyColors = { D: '#5a7a8f', R: '#8f6b6b', 'R/I': '#7a6b8f', 'R/Liberal': '#6b8f8a', 'R (Fusion)': '#8f8a6b' };

    // Segment row
    const segRow = document.createElement('div');
    segRow.className = 'mayor-segments-row';
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
      seg.title = `${m.name} (${m.party}, ${m.start}–${m.end})`;
      // Show last name for wide segments, initial for narrow
      const lastName = m.name.split(' ').pop();
      if (pct > 6) {
        seg.textContent = lastName;
      } else if (pct > 2.5) {
        seg.textContent = lastName.charAt(0);
      }
      segRow.appendChild(seg);
    });
    bar.appendChild(segRow);

    // Year ticks row — decade markers anchoring the bar to the timeline
    const tickRow = document.createElement('div');
    tickRow.className = 'mayor-ticks-row';
    for (let y = Math.ceil(MIN_YEAR / 10) * 10; y <= MAX_YEAR; y += 10) {
      const pct = ((y - MIN_YEAR) / totalYears) * 100;
      const tick = document.createElement('span');
      tick.className = 'mayor-tick';
      tick.style.left = pct + '%';
      tick.textContent = y;
      tickRow.appendChild(tick);
    }
    bar.appendChild(tickRow);
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

    // Blue/amber pair: colorblind-safe, with dash pattern differentiation
    const revColor = '#4a6f8a';  // steel blue
    const expColor = '#b87d5a';  // warm amber
    const datasets = [
      {
        label: 'Revenue',
        data: revData,
        borderColor: revColor,
        backgroundColor: isArea ? alpha(revColor, 0.18) : alpha(revColor, 0.7),
        fill: isArea,
        type: isBar ? 'bar' : 'line',
        borderWidth: 2.5,
        order: 1
      },
      {
        label: 'Expenditure',
        data: expData,
        borderColor: expColor,
        backgroundColor: isArea ? alpha(expColor, 0.12) : alpha(expColor, 0.7),
        fill: isArea,
        type: isBar ? 'bar' : 'line',
        borderWidth: 2.5,
        borderDash: isBar ? [] : [6, 3],
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
        layout: { padding: { right: isBar ? 0 : 120 } },
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
          endpointLabels: { display: !isBar },
          annotationLines: { years: Object.keys(D.annotations).map(Number) },
          tooltip: {
            callbacks: {
              title: items => 'FY ' + items[0].label,
              afterTitle: items => {
                const yr = parseInt(items[0].label);
                const m = getMayor(yr);
                return m ? `Mayor: ${m.name}` : '';
              },
              label: item => `  ${item.dataset.label}: ${fmt(item.raw)}`,
              afterBody: items => {
                const rev = items.find(i => i.dataset.label === 'Revenue');
                const exp = items.find(i => i.dataset.label === 'Expenditure');
                if (rev && exp) {
                  const diff = rev.raw - exp.raw;
                  const tag = diff >= 0 ? 'Surplus' : 'Deficit';
                  return `  ${tag}: ${fmt(Math.abs(diff))}`;
                }
                return '';
              },
              footer: items => {
                const yr = parseInt(items[0].label);
                const note = D.annotations[yr];
                return note ? '\n' + note : '';
              }
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
      chip.innerHTML = `<span class="dot"></span><strong>${yr}</strong> ${text}`;
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

    const labels = YEARS;

    // Sort categories by average value — largest at bottom of stack (first in array)
    const cats = Object.keys(EXP_COLORS);
    const catAvgs = cats.map(cat => {
      const avg = labels.reduce((s, y) => s + (D.years[y]?.expenditures?.[cat] || 0), 0) / labels.length;
      return { cat, avg };
    });
    catAvgs.sort((a, b) => b.avg - a.avg);
    const sortedCats = catAvgs.map(d => d.cat);

    const LINE_DASHES = [[], [8, 4], [3, 3], [12, 4, 3, 4], [6, 2], [2, 6]];
    const datasets = sortedCats.map((cat, idx) => {
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
      const isMultiLine = mode === 'line-multi';
      return {
        label: EXP_LABELS[cat],
        data,
        borderColor: EXP_COLORS[cat],
        backgroundColor: isStacked || isBar ? alpha(EXP_COLORS[cat], 0.75) : alpha(EXP_COLORS[cat], 0.1),
        fill: isStacked && !isBar,
        borderWidth: isBar ? 0 : (isStacked ? 1 : 2),
        borderDash: isMultiLine ? (LINE_DASHES[idx % LINE_DASHES.length]) : [],
        stack: isStacked ? 'stack' : undefined,
        type: isBar ? 'bar' : 'line',
        pointRadius: 0,
        order: idx
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
              title: items => {
                const yr = items[0].label;
                const m = getMayor(parseInt(yr));
                return 'FY ' + yr + (m ? '  ·  ' + m.name : '');
              },
              label: item => {
                const v = item.raw;
                return `  ${item.dataset.label}: ${isPct ? v.toFixed(1) + '%' : fmt(v)}`;
              },
              afterBody: function(items) {
                if (isPct || items.length === 0) return '';
                const yr = parseInt(items[0].label);
                const total = adj(getExpTotal(yr), yr);
                return `\n  Total: ${fmt(total)}`;
              }
            }
          }
        }
      }
    });

    renderLegend('expenditure-legend', sortedCats, EXP_LABELS, EXP_COLORS, 'expenditures');
  }

  // ---- Revenue Chart ----
  function renderRevenue() {
    if (charts.revenue) charts.revenue.destroy();
    const mode = chartModes.revenue;
    const isPct = mode === 'pct';
    const isStacked = mode === 'stacked-area' || mode === 'stacked-bar' || isPct;
    const isBar = mode === 'stacked-bar';

    const labels = YEARS;

    // Sort categories by average value — largest at bottom of stack
    const cats = Object.keys(REV_COLORS);
    const catAvgs = cats.map(cat => {
      const avg = labels.reduce((s, y) => s + (D.years[y]?.revenue?.[cat] || 0), 0) / labels.length;
      return { cat, avg };
    });
    catAvgs.sort((a, b) => b.avg - a.avg);
    const sortedCats = catAvgs.map(d => d.cat);

    const LINE_DASHES = [[], [8, 4], [3, 3], [12, 4, 3, 4], [6, 2], [2, 6]];
    const datasets = sortedCats.map((cat, idx) => {
      const rawData = labels.map(y => adj(D.years[y]?.revenue?.[cat] || 0, y));
      let data = rawData;
      if (isPct) {
        data = labels.map((y, i) => {
          const total = adj(getRevTotal(y), y);
          return total > 0 ? (rawData[i] / total) * 100 : 0;
        });
      }
      const isMultiLine = mode === 'line-multi';
      return {
        label: REV_LABELS[cat],
        data,
        borderColor: REV_COLORS[cat],
        backgroundColor: isStacked || isBar ? alpha(REV_COLORS[cat], 0.75) : alpha(REV_COLORS[cat], 0.1),
        fill: isStacked && !isBar,
        borderWidth: isBar ? 0 : (isStacked ? 1 : 2),
        borderDash: isMultiLine ? (LINE_DASHES[idx % LINE_DASHES.length]) : [],
        stack: isStacked ? 'stack' : undefined,
        type: isBar ? 'bar' : 'line',
        pointRadius: 0,
        order: idx
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
              title: items => {
                const yr = items[0].label;
                const m = getMayor(parseInt(yr));
                return 'FY ' + yr + (m ? '  ·  ' + m.name : '');
              },
              label: item => {
                const v = item.raw;
                return `  ${item.dataset.label}: ${isPct ? v.toFixed(1) + '%' : fmt(v)}`;
              },
              afterBody: function(items) {
                if (isPct || items.length === 0) return '';
                const yr = parseInt(items[0].label);
                const total = adj(getRevTotal(yr), yr);
                return `\n  Total: ${fmt(total)}`;
              }
            }
          }
        }
      }
    });

    renderLegend('revenue-legend', sortedCats, REV_LABELS, REV_COLORS, 'revenue');
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

    // Helper: sort categories by Year B value descending (largest at top)
    function sortedIndices(cats, dataObj, yr) {
      return cats.map((c, i) => ({ i, val: adj(dataObj[c] || 0, yr) }))
        .sort((a, b) => b.val - a.val)
        .map(d => d.i);
    }

    if (mode === 'side-by-side' || mode === 'overlay') {
      // Sort by Year B values (the comparison target)
      const expOrder = sortedIndices(expCats, dataB.expenditures, yearB);
      const revOrder = sortedIndices(revCats, dataB.revenue, yearB);

      const expLabelsSorted = expOrder.map(i => EXP_LABELS[expCats[i]]);
      const revLabelsSorted = revOrder.map(i => REV_LABELS[revCats[i]]);

      const expDataA = expOrder.map(i => adj(dataA.expenditures[expCats[i]] || 0, yearA));
      const expDataB = expOrder.map(i => adj(dataB.expenditures[expCats[i]] || 0, yearB));
      const revDataA = revOrder.map(i => adj(dataA.revenue[revCats[i]] || 0, yearA));
      const revDataB = revOrder.map(i => adj(dataB.revenue[revCats[i]] || 0, yearB));

      charts.compareExp = new Chart(document.getElementById('compare-exp-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: expLabelsSorted,
          datasets: [
            { label: String(yearA), data: expDataA, backgroundColor: alpha('#4a6f8a', 0.7), borderRadius: 3 },
            { label: String(yearB), data: expDataB, backgroundColor: alpha('#b87d5a', 0.7), borderRadius: 3 }
          ]
        },
        options: compareBarOptions('Expenditures')
      });

      charts.compareRev = new Chart(document.getElementById('compare-rev-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: revLabelsSorted,
          datasets: [
            { label: String(yearA), data: revDataA, backgroundColor: alpha('#4a6f8a', 0.7), borderRadius: 3 },
            { label: String(yearB), data: revDataB, backgroundColor: alpha('#b87d5a', 0.7), borderRadius: 3 }
          ]
        },
        options: compareBarOptions('Revenue')
      });
    } else {
      // Delta mode — sort by absolute magnitude of change
      const expDeltaPairs = expCats.map(c => {
        const a = adj(dataA.expenditures[c] || 0, yearA);
        const b = adj(dataB.expenditures[c] || 0, yearB);
        return { cat: c, delta: pctChange(a, b) ?? 0 };
      }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

      const revDeltaPairs = revCats.map(c => {
        const a = adj(dataA.revenue[c] || 0, yearA);
        const b = adj(dataB.revenue[c] || 0, yearB);
        return { cat: c, delta: pctChange(a, b) ?? 0 };
      }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

      const deltaColor = v => v >= 0 ? alpha('#b87d5a', 0.7) : alpha('#4a6f8a', 0.7);

      charts.compareExp = new Chart(document.getElementById('compare-exp-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: expDeltaPairs.map(d => EXP_LABELS[d.cat]),
          datasets: [{
            label: '% Change',
            data: expDeltaPairs.map(d => d.delta),
            backgroundColor: expDeltaPairs.map(d => deltaColor(d.delta)),
            borderRadius: 3
          }]
        },
        options: deltaBarOptions(`Expenditure Change: ${yearA} → ${yearB}`)
      });

      charts.compareRev = new Chart(document.getElementById('compare-rev-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: revDeltaPairs.map(d => REV_LABELS[d.cat]),
          datasets: [{
            label: '% Change',
            data: revDeltaPairs.map(d => d.delta),
            backgroundColor: revDeltaPairs.map(d => deltaColor(d.delta)),
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
      layout: { padding: { right: 60 } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: v => fmt(v) },
          grid: { color: '#eeece8', drawTicks: false },
          title: { display: true, text: inflationAdjust ? '2024 dollars (millions)' : 'Nominal dollars (millions)', font: { size: 10 } }
        },
        y: {
          ticks: { font: { size: 10 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 16 } },
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'right',
          formatter: v => fmt(v),
          font: { size: 9, family: "'JetBrains Mono', monospace", weight: 500 },
          color: '#6b6b6f',
          padding: { left: 4 }
        },
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
      layout: { padding: { right: 50, left: 50 } },
      scales: {
        x: {
          ticks: { callback: v => v.toFixed(0) + '%' },
          grid: { color: '#eeece8', drawTicks: false }
        },
        y: {
          ticks: { font: { size: 10 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: true,
          anchor: 'end',
          align: function(ctx) {
            return ctx.dataset.data[ctx.dataIndex] >= 0 ? 'right' : 'left';
          },
          formatter: v => (v >= 0 ? '+' : '') + v.toFixed(0) + '%',
          font: { size: 9, family: "'JetBrains Mono', monospace", weight: 600 },
          color: function(ctx) {
            return ctx.dataset.data[ctx.dataIndex] >= 0 ? '#b87d5a' : '#4a6f8a';
          },
          padding: { left: 4, right: 4 }
        },
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

    // Expenditure horizontal bars — sorted by value
    if (charts.timelineExp) charts.timelineExp.destroy();
    const expCats = Object.keys(EXP_LABELS);
    const expVals = expCats.map(c => adj(data.expenditures[c] || 0, year));
    // Build sorted pairs, filter near-zero, sort descending
    const expPairs = expCats.map((c, i) => ({ cat: c, val: expVals[i] }))
      .filter(d => d.val > 0.5)
      .sort((a, b) => b.val - a.val);
    const expTotal = expPairs.reduce((s, d) => s + d.val, 0);

    charts.timelineExp = new Chart(document.getElementById('timeline-exp-chart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: expPairs.map(d => EXP_LABELS[d.cat]),
        datasets: [{
          data: expPairs.map(d => d.val),
          backgroundColor: expPairs.map(d => alpha(EXP_COLORS[d.cat], 0.8)),
          borderColor: expPairs.map(d => EXP_COLORS[d.cat]),
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        layout: { padding: { right: 55 } },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#eeece8', drawTicks: false },
            ticks: { callback: v => fmt(v), font: { size: 9 } },
            title: { display: true, text: 'Expenditures' + (expTotal > 0 ? '  ·  Total: ' + fmt(expTotal) : ''), font: { size: 11, weight: 600 }, color: '#8f5a5a' }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 9 } }
          }
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            formatter: function(value) {
              const pct = expTotal > 0 ? (value / expTotal * 100).toFixed(0) : '0';
              return fmt(value) + '  ' + pct + '%';
            },
            font: { size: 8, family: "'JetBrains Mono', monospace", weight: 500 },
            color: '#6b6b6f'
          },
          tooltip: {
            callbacks: {
              label: item => `${item.label}: ${fmt(item.raw)} (${(expTotal > 0 ? (item.raw / expTotal * 100).toFixed(1) : 0)}%)`
            }
          }
        }
      }
    });

    // Revenue horizontal bars — sorted by value
    if (charts.timelineRev) charts.timelineRev.destroy();
    const revCats = Object.keys(REV_LABELS);
    const revVals = revCats.map(c => adj(data.revenue[c] || 0, year));
    const revPairs = revCats.map((c, i) => ({ cat: c, val: revVals[i] }))
      .filter(d => d.val > 0.5)
      .sort((a, b) => b.val - a.val);
    const revTotal = revPairs.reduce((s, d) => s + d.val, 0);

    charts.timelineRev = new Chart(document.getElementById('timeline-rev-chart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: revPairs.map(d => REV_LABELS[d.cat]),
        datasets: [{
          data: revPairs.map(d => d.val),
          backgroundColor: revPairs.map(d => alpha(REV_COLORS[d.cat], 0.8)),
          borderColor: revPairs.map(d => REV_COLORS[d.cat]),
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        layout: { padding: { right: 55 } },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#eeece8', drawTicks: false },
            ticks: { callback: v => fmt(v), font: { size: 9 } },
            title: { display: true, text: 'Revenue' + (revTotal > 0 ? '  ·  Total: ' + fmt(revTotal) : ''), font: { size: 11, weight: 600 }, color: '#5a7a6b' }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 9 } }
          }
        },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'right',
            formatter: function(value) {
              const pct = revTotal > 0 ? (value / revTotal * 100).toFixed(0) : '0';
              return fmt(value) + '  ' + pct + '%';
            },
            font: { size: 8, family: "'JetBrains Mono', monospace", weight: 500 },
            color: '#6b6b6f'
          },
          tooltip: {
            callbacks: {
              label: item => `${item.label}: ${fmt(item.raw)} (${(revTotal > 0 ? (item.raw / revTotal * 100).toFixed(1) : 0)}%)`
            }
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
