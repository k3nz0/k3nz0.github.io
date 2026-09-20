import { DEFAULTS, FIELD_LABELS, simulate, validate } from './model.js';

const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const compact = (value) => `${value < 0 ? '−' : ''}${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(value))}`;
const decimal = (value) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
const percent = (value) => `${decimal(value)} %`;
const duration = (value) => `${decimal(value)} ${value < 2 ? 'an' : 'ans'}`;
const signed = (value) => `${value < 0 ? '−' : '+'}${compact(Math.abs(value))}`;
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const GROUPS = {
  purchase: [
    ['price', '€', 10000, 'Prix affiché ou négocié, frais d’agence inclus.'],
    ['downPayment', '€', 10000, 'Contribution au prix du bien, hors frais.'],
    ['acquisitionRate', '%', 0.1, 'Pourcentage du prix d’achat, à confirmer avec votre notaire.'],
    ['loanFees', '€', 500],
    ['setupCosts', '€', 1000],
    ['liquidationTax', '€', 1000, 'Impôts supplémentaires liés à la cession de placements pour financer l’achat, pas sur la totalité des sommes retirées.'],
    ['saleRate', '%', 0.5, 'Frais d’agence et autres frais de cession, en pourcentage du prix de revente.'],
  ],
  mortgage: [
    ['mortgageRate', '% / an', 0.1, 'Taux nominal, hors assurance et frais initiaux.'],
    ['term', 'ans', 1],
    ['insuranceRate', '% / an', 0.01, 'Pourcentage annuel du capital initial emprunté.'],
    ['netIncome', '€ / mois', 100, 'Salaire de base uniquement, hors actions de l’employeur. Sert au calcul indicatif du taux d’endettement.'],
    ['otherDebt', '€ / mois', 50],
  ],
  cost: [
    ['rent', '€ / mois', 50, 'Hors charges locatives. Les 1 900 € sont une hypothèse à vérifier.'],
    ['ownerCosts', '€ / mois', 50, 'Taxe foncière, charges de copropriété non récupérables et provision d’entretien. Hors crédit.'],
    ['rentGrowth', '% / an', 0.5],
    ['costGrowth', '% / an', 0.5],
  ],
  wealth: [
    ['savings', '€', 10000, 'Valeur actuelle des comptes et placements, réserve de liquidités incluse.'],
    ['reserve', '€', 5000, 'Conservée dans les deux options, sans rendement dans le modèle.'],
    ['investmentReturn', '% / an', 0.5, 'Rendement nominal APRÈS frais et impôts. Non garanti.'],
    ['homeGrowth', '% / an', 0.5, 'Évolution annuelle nominale. Une valeur négative simule une baisse.'],
  ],
};
const growthKeys = ['investmentReturn', 'homeGrowth', 'rentGrowth', 'costGrowth'];
let params = { ...DEFAULTS };
let result = null;

for (const [group, fields] of Object.entries(GROUPS)) {
  $(`#${group}-fields`).innerHTML = fields.map(([key, unit, step, hint]) => {
    const label = FIELD_LABELS[key];
    const min = growthKeys.includes(key) ? -99 : key === 'term' ? 1 : 0;
    const max = key === 'term' ? 40 : growthKeys.includes(key) || ['acquisitionRate', 'saleRate', 'mortgageRate', 'insuranceRate'].includes(key) ? 30 : undefined;
    return `<div class="field"><label class="field-label" for="${key}">${label}</label><div class="field-input"><input id="${key}" name="${key}" type="number" inputmode="decimal" min="${min}" ${max !== undefined ? `max="${max}"` : ''} step="${step}" value="${params[key]}" ${hint ? `aria-describedby="${key}-hint"` : ''}><span class="unit">${unit}</span></div>${hint ? `<p class="field-hint" id="${key}-hint">${hint}</p>` : ''}</div>`;
  }).join('');
}
function row(label, value, classes = '') {
  return `<div class="data-row ${classes}"><span>${label}</span><strong>${value}</strong></div>`;
}
function render() {
  $('#years-value').textContent = duration(params.years);
  const errors = validate(params);
  $('#validation').hidden = !errors.length;
  $('#result-content').hidden = !!errors.length;
  if (errors.length) {
    result = null;
    $('#validation').innerHTML = `<strong>Quelques hypothèses sont à corriger.</strong><ul>${errors.map((error) => `<li>${escape(error)}</li>`).join('')}</ul>`;
    return;
  }
  result = simulate(params);
  const { final, monthlyBuyerCost, mortgage, insurance, initialInvestments } = result;
  const difference = final.difference;
  const close = Math.abs(difference) < 1000;
  const buyWins = difference > 0;
  $('.verdict').dataset.outcome = close ? 'tie' : buyWins ? 'buy' : 'rent';
  $('#verdict-label').textContent = `AU BOUT DE ${duration(params.years).toLocaleUpperCase('fr-FR')}`;
  $('#verdict-title').textContent = close ? 'Des résultats presque équivalents.' : buyWins ? 'L’achat prend l’avantage.' : 'La location prend l’avantage.';
  $('#verdict-copy').textContent = `Selon ces hypothèses, pas une prévision. La stabilité, la flexibilité et le plaisir d’habiter votre logement ne sont pas chiffrés.`;
  $('#advantage').textContent = money(Math.abs(difference));
  $('#buyer-wealth').textContent = money(final.buyerWealth);
  $('#renter-wealth').textContent = money(final.renterWealth);
  $('#monthly-buy').textContent = money(monthlyBuyerCost);
  $('#monthly-detail').textContent = `${money(mortgage + insurance)} crédit + assurance · ${money(params.ownerCosts)} charges propriétaire`;
  $('#crossover').textContent = result.firstCrossover === null ? `L’achat ne rattrape pas la location sur ${duration(params.years)}.` : `Premier point d’équilibre simulé : ${duration(result.firstCrossover)}. L’avantage peut ensuite s’inverser.`;
  renderChart(result.points);
  renderYearlyTable();
  const allocation = [
    { name: 'Apport / capital immobilier', value: params.downPayment, color: 'var(--down)' },
    { name: 'Frais, installation et impôts', value: result.upfront - params.downPayment, color: 'var(--fees)' },
    { name: 'Réserve de liquidités', value: params.reserve, color: 'var(--cash)' },
    { name: 'Épargne restant investie', value: initialInvestments, color: 'var(--green)' },
  ];
  $('#allocation-bar').innerHTML = allocation.filter((item) => item.value > 0).map((item) => `<span style="width:${params.savings ? item.value / params.savings * 100 : 0}%;background:${item.color}" title="${item.name}: ${money(item.value)}"></span>`).join('');
  $('#allocation-list').innerHTML = allocation.map((item) => row(`<i class="row-dot" style="background:${item.color}"></i>${item.name}`, money(item.value))).join('') + row('Épargne totale de départ', money(params.savings), 'total');
  $('#cashflow-list').innerHTML = row('Crédit : capital + intérêts', money(mortgage)) + row('Assurance emprunteur', money(insurance)) + row('Charges propres au propriétaire', money(params.ownerCosts)) + row('Achat : dépenses mensuelles totales', money(monthlyBuyerCost), 'total') + row('Location : loyer mensuel comparable', money(params.rent));
  const monthlyGap = monthlyBuyerCost - params.rent;
  $('#monthly-saving').innerHTML = `<strong>${monthlyGap >= 0 ? 'Le locataire' : 'L’acheteur'} place ${money(Math.abs(monthlyGap))} de plus</strong> le premier mois. Cet écart évolue avec les loyers et les charges, puis à la fin du crédit.`;
  renderSensitivity();
  renderFinancing();
}

function renderChart(points) {
  const width = 780, height = 302;
  const padding = { left: 66, right: 18, top: 25, bottom: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = points.flatMap((point) => [point.buyerWealth, point.renterWealth]);
  let min = Math.min(...values), max = Math.max(...values);
  const range = Math.max(max - min, Math.abs(max) * 0.15, 10000);
  min -= range * 0.12;
  max += range * 0.12;
  const x = (year) => padding.left + year / params.years * plotWidth;
  const y = (value) => padding.top + (max - value) / (max - min) * plotHeight;
  const line = (key) => points.map((point, i) => `${i ? 'L' : 'M'}${x(point.year).toFixed(2)},${y(point[key]).toFixed(2)}`).join(' ');
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const value = min + (max - min) * i / 4;
    grid += `<line class="grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${y(value)}" y2="${y(value)}"/><text x="${padding.left - 12}" y="${y(value) + 4}" text-anchor="end">${compact(value)}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    const year = params.years * i / 4;
    grid += `<text x="${x(year)}" y="${height - 24}" text-anchor="middle">${decimal(year)}</text>`;
  }
  $('#wealth-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-description"><title id="chart-title">Patrimoine net à l’achat et en location sur ${duration(params.years)}</title><desc id="chart-description">Axe horizontal : années depuis l’achat. Axe vertical : patrimoine net en euros courants après revente hypothétique du bien. Au bout de ${duration(params.years)}, le patrimoine atteint ${money(result.final.buyerWealth)} à l’achat et ${money(result.final.renterWealth)} en location. Les données annuelles sont disponibles ci-dessous.</desc><text x="${padding.left}" y="11">Patrimoine net · EUR</text>${grid}<text x="${padding.left + plotWidth / 2}" y="${height}" text-anchor="middle">Années depuis l’achat</text><path class="series-buy" d="${line('buyerWealth')}" fill="none" stroke-width="2.8"/><path class="series-rent" d="${line('renterWealth')}" fill="none" stroke-width="2.8"/><line id="chart-crosshair" x1="0" x2="0" y1="${padding.top}" y2="${height - padding.bottom}" stroke="var(--muted)" stroke-dasharray="3 4" visibility="hidden"/><rect id="chart-hit" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"/></svg><div id="chart-tooltip" class="chart-tooltip" hidden></div>`;
  const chart = $('#wealth-chart');
  const svg = chart.querySelector('svg');
  const hit = $('#chart-hit');
  const tooltip = $('#chart-tooltip');
  const crosshair = $('#chart-crosshair');
  hit.addEventListener('pointermove', (event) => {
    const rect = svg.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * width;
    const month = Math.max(0, Math.min(points.length - 1, Math.round((px - padding.left) / plotWidth * params.years * 12)));
    const point = points[month];
    crosshair.setAttribute('x1', x(point.year));
    crosshair.setAttribute('x2', x(point.year));
    crosshair.setAttribute('visibility', 'visible');
    tooltip.hidden = false;
    tooltip.innerHTML = `<strong>Année ${decimal(point.year)}</strong><br>Achat : ${money(point.buyerWealth)}<br>Location : ${money(point.renterWealth)}<br>Achat − location : ${signed(point.difference)}`;
    tooltip.style.left = `${Math.max(0, Math.min(rect.width - tooltip.offsetWidth, event.clientX - rect.left + 15))}px`;
  });
  hit.addEventListener('pointerleave', () => {
    tooltip.hidden = true;
    crosshair.setAttribute('visibility', 'hidden');
  });
}

function renderYearlyTable() {
  const annual = result.points.filter((point) => point.month % 12 === 0);
  $('#yearly-table').innerHTML = `<table><caption class="fine-print">Patrimoine net estimé et crédit restant en fin d’année · euros courants</caption><thead><tr><th scope="col">Année</th><th scope="col">Patrimoine à l’achat</th><th scope="col">Patrimoine en location</th><th scope="col">Achat − location</th><th scope="col">Capital restant dû</th></tr></thead><tbody>${annual.map((point) => `<tr><th scope="row">${point.year}</th><td>${money(point.buyerWealth)}</td><td>${money(point.renterWealth)}</td><td>${signed(point.difference)}</td><td>${money(point.debt)}</td></tr>`).join('')}</tbody></table>`;
}
function renderSensitivity() {
  const bounded = (value) => Math.max(-99, Math.min(30, value));
  const investmentRates = [...new Set([bounded(params.investmentReturn - 2), params.investmentReturn, bounded(params.investmentReturn + 2)])];
  const houseRates = [...new Set([bounded(params.homeGrowth - 1), params.homeGrowth, bounded(params.homeGrowth + 1)])];
  $('#sensitivity-horizon').textContent = `Horizon : ${duration(params.years)}`;
  $('#sensitivity-table').innerHTML = `<table><caption class="fine-print">Avantage patrimonial de l’achat · euros courants ; colonnes : évolution annuelle du prix du bien</caption><thead><tr><th scope="col">Rendement net ↓<br>Prix du bien →</th>${houseRates.map((rate) => `<th scope="col">${percent(rate)} / an</th>`).join('')}</tr></thead><tbody>${investmentRates.map((rate) => `<tr><th scope="row">${percent(rate)} / an</th>${houseRates.map((houseRate) => {
    const difference = simulate({ ...params, investmentReturn: rate, homeGrowth: houseRate }).final.difference;
    const current = rate === params.investmentReturn && houseRate === params.homeGrowth;
    return `<td class="${difference >= 0 ? 'favors-buy' : 'favors-rent'} ${current ? 'current' : ''}" ${current ? 'aria-label="Hypothèses actuelles : ' + signed(difference) + '"' : ''}>${signed(difference)}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderFinancing() {
  const ratio = result.debtRatio;
  const over = ratio !== null && ratio > 0.35;
  $('#financing-content').innerHTML = `<div class="financing-stats"><div><span>Capital à emprunter</span><strong>${money(result.loan)}</strong></div><div><span>Taux d’endettement indicatif</span><strong>${ratio === null ? 'Non calculé' : percent(ratio * 100)}</strong></div></div>${ratio === null ? '' : `<div class="ratio-track" role="img" aria-label="Taux d’endettement : ${percent(ratio * 100)} ; seuil de référence : 35 %"><div class="fill" style="width:${Math.min(100, Math.max(0, ratio * 200))}%;${over ? 'background:var(--rust)' : ''}"></div><div class="threshold"></div></div>`}<p class="finance-note ${over ? 'warning' : ''}">${ratio === null ? 'Saisissez un revenu net avant impôt supérieur à zéro pour calculer le ratio.' : `${over ? 'Au-dessus' : 'Dans la limite'} du seuil usuel de 35 %, assurance et crédits existants inclus. ${over ? 'Un apport plus élevé, un prix plus bas ou d’autres conditions de prêt peuvent être nécessaires.' : 'Ce ratio ne vaut ni accord bancaire ni garantie de confort budgétaire.'}`} Vérifiez vos fiches de paie, les critères bancaires et vos dépenses après impôt.</p>`;
}

$('#assumptions').addEventListener('submit', (event) => event.preventDefault());
$('#assumptions').addEventListener('input', (event) => {
  const input = event.target;
  if (!Object.hasOwn(DEFAULTS, input.name)) return;
  params[input.name] = input.value === '' ? NaN : Number(input.value);
  render();
});
$('#years').addEventListener('input', (event) => {
  params.years = Number(event.target.value);
  render();
});
function resetSimulation() {
  params = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) if ($(`#${key}`)) $(`#${key}`).value = params[key];
  render();
}
$('#reset').addEventListener('click', resetSimulation);
$('#export').addEventListener('click', () => {
  if (!result) return;
  const rows = [
    ['Louer ou acheter — scénario déterministe, pas une prévision'],
    ['Hypothèse', 'Valeur'],
    ...Object.entries(params).map(([key, value]) => {
      const field = Object.values(GROUPS).flat().find(([name]) => name === key);
      return [`${FIELD_LABELS[key]} (${field?.[1] ?? 'ans'})`, value];
    }),
    [],
    ['Année', 'Patrimoine net à l’achat (EUR)', 'Patrimoine net en location (EUR)', 'Avantage de l’achat (EUR)', 'Valeur du bien (EUR)', 'Capital restant dû (EUR)', 'Produit net de revente (EUR)', 'Placements de l’acheteur (EUR)', 'Placements du locataire (EUR)', 'Intérêts du crédit cumulés (EUR)', 'Capital remboursé cumulé (EUR)', 'Loyers cumulés (EUR)', 'Charges propriétaire cumulées (EUR)', 'Assurance emprunteur cumulée (EUR)'],
    ...result.points.filter((point) => point.month % 12 === 0).map((point) => [point.year, point.buyerWealth, point.renterWealth, point.difference, point.house, point.debt, point.equity, point.buyerInvestments, point.renterInvestments, point.interestPaid, point.principalPaid, point.rentPaid, point.ownerCostsPaid, point.insurancePaid].map((number) => Math.round(number * 100) / 100)),
  ];
  // Semicolon-delimited, decimal commas and UTF-8 BOM for French spreadsheets.
  const csvNumber = new Intl.NumberFormat('fr-FR', { useGrouping: false, maximumFractionDigits: 10 });
  const csv = rows.map((cells) => cells.map((cell) => `"${(typeof cell === 'number' ? csvNumber.format(cell) : String(cell)).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `simulation-immobiliere-${params.years}-${params.years === 1 ? 'an' : 'ans'}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Keep the phone UI focused on the results instead of opening a long form.
if (window.matchMedia('(max-width: 650px)').matches) {
  document.querySelectorAll('#assumptions details').forEach((details) => { details.open = false; });
}
// Opening the page and clicking Reset use exactly the same initialization path.
resetSimulation();
