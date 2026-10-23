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
  const space = ["monthlyRent", "associationDues", "parkingFees", "storageFees", "otherLocationExpenses"].reduce((sum, key) => sum + (Number(profile?.locationExpenses?.[key]) || 0), 0);
  const fixed = profile?.overhead?.fixed || [];
  const variable = profile?.overhead?.variable || [];
  const periodic = profile?.overhead?.periodic || [];
  const rows = [...fixed, ...variable, ...periodic];
  const hasRecordedExpense = rows.some((expense: any) => Number(expense?.amount) > 0);

  if (hasRecordedExpense) {
    return space + fixed.reduce((sum: number, expense: any) => sum + monthlyAmount(expense), 0)
      + variable.reduce((sum: number, expense: any) => sum + monthlyAmount(expense), 0)
      + periodic.reduce((sum: number, expense: any) => sum + monthlyAmount(expense, "Annual"), 0);
  }

  return space;

}

export function withSynchronizedOperationCost(profile: any) {
  const overheadMonthly = monthlyOperationCost(profile);
  return {
    ...profile,
    overhead: { ...(profile?.overhead || {}), monthlyOverheadPool: overheadMonthly },
    calculatorCosts: { ...(profile?.calculatorCosts || {}), overheadMonthly },
  };
}

// Business Settings records are authoritative, including empty and zero values.
export function businessSettingsCosts(profile: any) {
  const days = Number(profile?.operations?.operatingDaysPerMonth) || 26;
  const production = Number(profile?.operations?.monthlyProductionUnits) || 0;
  const team = (profile?.manpower || []).reduce((sum: number, row: any) =>
    sum + (Number(row.amount) || 0) + (Number(row.benefits) || 0) + (Number(row.contributions) || 0), 0);
  const owner = profile?.ownerLabor?.includeOwnTime === "Yes"
    ? Number(profile.ownerLabor.desiredMonthlyCompensation) || 0 : 0;
  return {
    labor: { monthlyCost: team + owner, workingDays: days, outputPerDay: production / days },
    overhead: { rent: 0, utilities: 0, miscellaneous: monthlyOperationCost(profile) },
  };
}
