export const DEFAULTS = Object.freeze({
  savings: 500000,
  reserve: 40000,
  price: 600000,
  downPayment: 150000,
  acquisitionRate: 8,
  loanFees: 5000,
  setupCosts: 15000,
  liquidationTax: 0,
  mortgageRate: 3.5,
  term: 25,
  insuranceRate: 0.2,
  rent: 1900,
  ownerCosts: 400,
  rentGrowth: 2,
  costGrowth: 2,
  investmentReturn: 8,
  homeGrowth: 3,
  saleRate: 4,
  years: 10,
  netIncome: 7000,
  otherDebt: 0,
});

export function payment(principal, annualRate, months) {
  if (principal === 0) return 0;
  const r = annualRate / 100 / 12;
  return r === 0 ? principal / months : principal * r / (1 - (1 + r) ** -months);
}

export const FIELD_LABELS = Object.freeze({
  savings: 'Épargne totale actuelle',
  reserve: 'Réserve de liquidités',
  price: 'Prix d’achat',
  downPayment: 'Apport personnel',
  acquisitionRate: 'Frais d’acquisition / de notaire',
  loanFees: 'Frais de crédit et de garantie',
  setupCosts: 'Travaux, ameublement et déménagement',
  liquidationTax: 'Impôts sur la vente de placements',
  mortgageRate: 'Taux fixe du crédit',
  term: 'Durée du crédit',
  insuranceRate: 'Assurance emprunteur',
  rent: 'Loyer mensuel comparable',
  ownerCosts: 'Charges propres au propriétaire',
  rentGrowth: 'Hausse annuelle du loyer',
  costGrowth: 'Hausse annuelle des charges',
  investmentReturn: 'Rendement net des placements',
  homeGrowth: 'Évolution du prix du bien',
  saleRate: 'Frais de revente',
  years: 'Durée de détention',
  netIncome: 'Salaire net avant impôt',
  otherDebt: 'Autres mensualités de crédit',
});

export function validate(p) {
  const errors = [];
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key])) errors.push(`${FIELD_LABELS[key]} : saisissez un nombre valide et fini.`);
  }
  if (errors.length) return errors;
  for (const key of ['savings', 'reserve', 'price', 'downPayment', 'acquisitionRate', 'loanFees', 'setupCosts', 'liquidationTax', 'mortgageRate', 'insuranceRate', 'rent', 'ownerCosts', 'saleRate', 'netIncome', 'otherDebt']) {
    if (p[key] < 0) errors.push(`${FIELD_LABELS[key]} : la valeur ne peut pas être négative.`);
  }
  if (p.price <= 0) errors.push('Le prix d’achat doit être supérieur à zéro.');
  if (p.downPayment > p.price) errors.push('L’apport ne peut pas dépasser le prix d’achat.');
  if (p.reserve > p.savings) errors.push('La réserve de liquidités ne peut pas dépasser l’épargne totale.');
  if (!Number.isInteger(p.term) || p.term < 1 || p.term > 40) errors.push('La durée du crédit doit être un nombre entier de 1 à 40 ans.');
  if (!Number.isInteger(p.years) || p.years < 1 || p.years > 40) errors.push('La durée de détention doit être un nombre entier de 1 à 40 ans.');
  for (const key of ['investmentReturn', 'homeGrowth', 'rentGrowth', 'costGrowth']) {
    if (p[key] <= -100 || p[key] > 30) errors.push(`${FIELD_LABELS[key]} : la valeur doit être supérieure à −100 % et inférieure ou égale à 30 %.`);
  }
  for (const key of ['acquisitionRate', 'saleRate', 'mortgageRate', 'insuranceRate']) {
    if (p[key] > 30) errors.push(`${FIELD_LABELS[key]} : la valeur ne peut pas dépasser 30 %.`);
  }
  const upfront = p.downPayment + p.price * p.acquisitionRate / 100 + p.loanFees + p.setupCosts + p.liquidationTax;
  if (upfront + p.reserve > p.savings) errors.push(`Épargne insuffisante : les fonds nécessaires à l’achat et la réserve dépassent votre épargne de ${Math.ceil(upfront + p.reserve - p.savings).toLocaleString('fr-FR')} €. Réduisez l’apport, les frais ou la réserve.`);
  return errors;
}

/**
 * Monthly deterministic model. Investment returns are effective annual returns,
 * after taxes and fees. Mortgage rates are nominal annual rates / 12.
 * Both households start with the same savings and cash reserve. Each month the
 * cheaper housing option invests the spending difference; equal additional
 * savings cancel. Home equity is marked to net sale proceeds, including sale
 * costs, at every displayed point. There is no separate principal-residence CGT.
 */
export function simulate(p) {
  const errors = validate(p);
  if (errors.length) throw new Error(errors.join('\n'));
  const loan = p.price - p.downPayment;
  const months = p.term * 12;
  const mortgage = payment(loan, p.mortgageRate, months);
  const insurance = loan * p.insuranceRate / 100 / 12;
  const acquisition = p.price * p.acquisitionRate / 100;
  const upfront = p.downPayment + acquisition + p.loanFees + p.setupCosts + p.liquidationTax;
  const initialInvestments = p.savings - p.reserve - upfront;
  const monthlyReturn = (1 + p.investmentReturn / 100) ** (1 / 12) - 1;
  const monthlyHomeGrowth = (1 + p.homeGrowth / 100) ** (1 / 12);
  let debt = loan;
  let house = p.price;
  let buyerInvestments = initialInvestments;
  let renterInvestments = p.savings - p.reserve;
  let interestPaid = 0;
  let principalPaid = 0;
  let rentPaid = 0;
  let ownerCostsPaid = 0;
  let insurancePaid = 0;
  let buyerContributions = 0;
  let renterContributions = 0;
  const snapshot = (month) => {
    const saleCosts = house * p.saleRate / 100;
    const equity = house - saleCosts - debt;
    const buyerWealth = buyerInvestments + p.reserve + equity;
    const renterWealth = renterInvestments + p.reserve;
    return { month, year: month / 12, house, debt, equity, saleCosts, buyerInvestments, renterInvestments, buyerWealth, renterWealth, difference: buyerWealth - renterWealth, interestPaid, principalPaid, rentPaid, ownerCostsPaid, insurancePaid, buyerContributions, renterContributions };
  };
  const points = [snapshot(0)];
  for (let month = 1; month <= p.years * 12; month++) {
    const elapsed = (month - 1) / 12;
    const rent = p.rent * (1 + p.rentGrowth / 100) ** elapsed;
    const runningCosts = p.ownerCosts * (1 + p.costGrowth / 100) ** elapsed;
    const hasLoan = debt > 0.000001 && month <= months;
    const interest = hasLoan ? debt * p.mortgageRate / 100 / 12 : 0;
    const installment = hasLoan ? Math.min(mortgage, debt + interest) : 0;
    const principal = installment - interest;
    const insuranceCost = hasLoan ? insurance : 0;
    debt = Math.max(0, debt - principal);
    if (month === months) debt = 0;
    const buyCost = installment + insuranceCost + runningCosts;
    const renterSaving = Math.max(0, buyCost - rent);
    const buyerSaving = Math.max(0, rent - buyCost);
    buyerInvestments = buyerInvestments * (1 + monthlyReturn) + buyerSaving;
    renterInvestments = renterInvestments * (1 + monthlyReturn) + renterSaving;
    house *= monthlyHomeGrowth;
    interestPaid += interest;
    principalPaid += principal;
    rentPaid += rent;
    ownerCostsPaid += runningCosts;
    insurancePaid += insuranceCost;
    buyerContributions += buyerSaving;
    renterContributions += renterSaving;
    points.push(snapshot(month));
  }
  // A first crossing is not a promise that buying stays ahead afterwards.
  const firstCrossover = points.find((point, i) => i > 0 && point.difference >= 0)?.year ?? null;
  const debtRatio = p.netIncome > 0 ? (mortgage + insurance + p.otherDebt) / p.netIncome : null;
  return { loan, mortgage, insurance, acquisition, upfront, initialInvestments, monthlyBuyerCost: mortgage + insurance + p.ownerCosts, monthlyRenterCost: p.rent, debtRatio, points, final: points.at(-1), firstCrossover };
}
