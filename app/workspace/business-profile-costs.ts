const monthlyMultiplier: Record<string, number> = {
  Daily: 365 / 12,
  Weekly: 52 / 12,
  Monthly: 1,
  Quarterly: 1 / 3,
  "Semi-annual": 1 / 6,
  Annual: 1 / 12,
  "One-time": 1 / 12,
};

function monthlyAmount(expense: any, defaultFrequency = "Monthly") {
  const amount = Number(expense?.amount) || 0;
  const frequency = expense?.frequency || defaultFrequency;
  return amount * (monthlyMultiplier[frequency] ?? 1);
}

export function monthlyOperationCost(profile: any) {
  const fixed = profile?.overhead?.fixed || [];
  const variable = profile?.overhead?.variable || [];
  const periodic = profile?.overhead?.periodic || [];
  const rows = [...fixed, ...variable, ...periodic];
  const hasRecordedExpense = rows.some((expense: any) => Number(expense?.amount) > 0);

  if (hasRecordedExpense) {
    return fixed.reduce((sum: number, expense: any) => sum + monthlyAmount(expense), 0)
      + variable.reduce((sum: number, expense: any) => sum + monthlyAmount(expense), 0)
      + periodic.reduce((sum: number, expense: any) => sum + monthlyAmount(expense, "Annual"), 0);
  }

  return Number(profile?.overhead?.monthlyOverheadPool)
    || Number(profile?.calculatorCosts?.overheadMonthly)
    || 0;
}

export function withSynchronizedOperationCost(profile: any) {
  const overheadMonthly = monthlyOperationCost(profile);
  return {
    ...profile,
    overhead: { ...(profile?.overhead || {}), monthlyOverheadPool: overheadMonthly },
    calculatorCosts: { ...(profile?.calculatorCosts || {}), overheadMonthly },
  };
}
