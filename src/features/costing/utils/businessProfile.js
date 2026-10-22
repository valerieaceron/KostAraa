function profileRecord(data) {
  return data?.profile || data?.business_profile || data?.result?.profile || data?.result?.business_profile || data?.result?.data || data?.result || data?.data?.profile || data?.data?.business_profile || data?.data || data || {};
}

function number(value) {
  return Number(value) || 0;
}

function countryCode(value) {
  return String(value || '').toLowerCase() === 'philippines' ? 'PH' : value || 'PH';
}

function currencyCode(value) {
  return String(value || '').toUpperCase().startsWith('PHP') ? 'PHP' : value || 'PHP';
}

function businessStageLabel(value) {
  const labels = {
    still_planning: 'Still planning',
    newly_operating: 'Newly operating',
    operating_and_growing: 'Operating and growing',
    operating_but_breaking_even: 'Operating but breaking even',
    operating_but_struggling: 'Operating but struggling',
    temporarily_inactive: 'Temporarily inactive',
    previously_operated: 'Previously operated',
  };
  return labels[String(value || '').toLowerCase()] || value || '';
}

const expenseCategoryLabels = {
  rent_and_space: 'Rent and space costs',
  internet_and_communication: 'Internet and communication',
  utilities: 'Electricity, water, and utilities',
  other_business_expense: 'Other business expense',
};

const expenseCategoryCodes = Object.fromEntries(
  Object.entries(expenseCategoryLabels).map(([code, label]) => [label, code]),
);

export function expenseCategoryLabel(value) {
  return expenseCategoryLabels[String(value || '').toLowerCase()] || value || '';
}

export function expenseCategoryCode(value) {
  return expenseCategoryCodes[value] || value || '';
}

function groupOverhead(rows, fallback) {
  const grouped = { fixed: [], variable: [], periodic: [] };
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const group = String(row.expense_group || row.group || '').toLowerCase();
    const target = group.includes('annual') || group.includes('occasional') || group.includes('periodic') ? 'periodic' : 'fixed';
    grouped[target].push({
      id: row.id || crypto.randomUUID(),
      group: target,
      name: row.expense_name || row.name || '',
      category: expenseCategoryLabel(row.expense_category || row.category),
      amount: number(row.amount),
      frequency: row.frequency === 'annual' ? 'Annual' : (row.frequency || 'Monthly'),
      startDate: row.start_date || row.startDate || '',
      notes: row.notes || '',
    });
  });
  if (!grouped.fixed.length && !grouped.periodic.length && fallback?.overhead) return fallback.overhead;
  return { ...grouped, monthlyOverheadPool: number(fallback?.overhead?.monthlyOverheadPool) };
}

export function normalizeBusinessProfile(data, fallback = {}) {
  const api = profileRecord(data);
  const hasMonthlySalesTarget = Object.prototype.hasOwnProperty.call(api, 'monthly_sales_target_units');
  const businessProfileId = api.business_profile_id || api.businessProfileId || api.profile_id || api.id || data?.business_profile_id || data?.businessProfileId || data?.profile_id || data?.id || data?.result?.business_profile_id || data?.result?.businessProfileId || data?.result?.profile_id || data?.result?.id || fallback.meta?.businessProfileId || null;
  const target = api.target_market || {};
  const pricing = api.pricing_preferences || {};
  const owner = api.owner_labor || {};
  const profile = {
    ...fallback,
    identity: {
      ...(fallback.identity || {}),
      businessName: api.business_name ?? fallback.identity?.businessName ?? '',
      description: api.business_description ?? fallback.identity?.description ?? '',
      category: api.business_category ?? fallback.identity?.category ?? '',
      country: api.country_code === 'PH' ? 'Philippines' : (api.country_code ?? fallback.identity?.country ?? ''),
      currency: api.currency_code === 'PHP' ? 'PHP (₱)' : (api.currency_code ?? fallback.identity?.currency ?? ''),
      city: api.province_or_city ?? fallback.identity?.city ?? '',
    },
    businessStage: {
      ...(fallback.businessStage || {}),
      stage: businessStageLabel(api.business_stage ?? fallback.businessStage?.stage ?? ''),
      startYear: api.year_started ?? fallback.businessStage?.startYear ?? '',
      plannedStartYear: api.year_started ?? fallback.businessStage?.plannedStartYear ?? '',
    },
    operations: {
      ...(fallback.operations || {}),
      monthlySalesUnits: hasMonthlySalesTarget
        ? number(api.monthly_sales_target_units)
        : number(fallback.operations?.monthlySalesUnits),
      monthlySalesTarget: hasMonthlySalesTarget
        ? number(api.monthly_sales_target_units)
        : number(fallback.operations?.monthlySalesTarget),
    },
    manpower: (api.manpower || fallback.manpower || []).map((row) => ({
      id: row.id || crypto.randomUUID(), nameOrRole: row.name_or_role || row.nameOrRole || '', position: row.position_name || row.position || '', employmentType: row.employment_type || row.employmentType || 'Owner', rateType: row.pay_type || row.rateType || 'Monthly salary', amount: number(row.pay_amount ?? row.amount), workingDays: number(row.working_days_per_month ?? row.workingDays), workingHours: number(row.working_hours_per_day ?? row.workingHours), benefits: number(row.benefits_and_allowances ?? row.benefits), contributions: number(row.employer_contributions ?? row.contributions), productionPercent: number(row.production_time_percentage ?? row.productionPercent), classification: row.labor_classification || row.classification || 'Direct labor',
    })),
    ownerLabor: {
      ...(fallback.ownerLabor || {}),
      includeOwnTime: owner.include_owner_pay === true ? 'Yes' : owner.include_owner_pay === false ? 'No' : (fallback.ownerLabor?.includeOwnTime || 'No'),
      desiredMonthlyCompensation: number(owner.desired_monthly_owner_pay) || number(fallback.ownerLabor?.desiredMonthlyCompensation),
      workingHoursPerMonth: number(owner.working_hours_per_month) || number(fallback.ownerLabor?.workingHoursPerMonth),
      productionPercent: number(owner.production_time_percentage) || number(fallback.ownerLabor?.productionPercent),
      administrationPercent: number(owner.management_time_percentage) || number(fallback.ownerLabor?.administrationPercent),
    },
    overhead: groupOverhead(api.overhead, fallback),
    targetMarket: {
      ...(fallback.targetMarket || {}), customerGroups: target.customer_groups || fallback.targetMarket?.customerGroups || [], frequentGroup: target.most_frequent_customer_group || fallback.targetMarket?.frequentGroup || '', ageGroup: target.typical_age_group || fallback.targetMarket?.ageGroup || '', locationType: target.customer_location_type || fallback.targetMarket?.locationType || '', customerLocation: target.main_city_or_area || fallback.targetMarket?.customerLocation || '', spendingPerOrder: number(target.usual_spending_per_order) || number(fallback.targetMarket?.spendingPerOrder), purchaseFrequency: target.purchase_frequency || fallback.targetMarket?.purchaseFrequency || '', buyingReasons: target.buying_reasons || fallback.targetMarket?.buyingReasons || [], priceSensitivity: target.price_sensitivity || fallback.targetMarket?.priceSensitivity || '', willingnessToPay: target.willingness_to_pay ?? fallback.targetMarket?.willingnessToPay ?? '', priorities: target.customer_priorities || fallback.targetMarket?.priorities || [],
    },
    pricingStrategy: {
      ...(fallback.pricingStrategy || {}), decisionMethods: pricing.pricing_decision_methods || fallback.pricingStrategy?.decisionMethods || [], pricePosition: pricing.desired_price_position || fallback.pricingStrategy?.pricePosition || 'Not sure yet', lowestUsualPrice: number(pricing.lowest_usual_price) || number(fallback.pricingStrategy?.lowestUsualPrice), highestUsualPrice: number(pricing.highest_usual_price) || number(fallback.pricingStrategy?.highestUsualPrice), profitPlan: pricing.profit_plan || fallback.pricingStrategy?.profitPlan || 'Recommended', desiredProfitMargin: number(pricing.desired_profit_margin) || number(fallback.pricingStrategy?.desiredProfitMargin), discountPractice: pricing.discount_practice || fallback.pricingStrategy?.discountPractice || 'No, rarely', biggestDiscount: pricing.biggest_discount || fallback.pricingStrategy?.biggestDiscount || 'Not sure', sellingType: pricing.selling_type || fallback.pricingStrategy?.sellingType || 'Retail only', retailPrice: number(pricing.usual_retail_price) || number(fallback.pricingStrategy?.retailPrice), wholesalePrice: number(pricing.usual_wholesale_price) || number(fallback.pricingStrategy?.wholesalePrice), minimumWholesaleOrder: number(pricing.minimum_wholesale_order) || number(fallback.pricingStrategy?.minimumWholesaleOrder),
    },
    salesChannels: (api.sales_channels || fallback.salesChannels || []).map((row) => ({ id: row.id || crypto.randomUUID(), name: row.channel_name || row.name || '', commissionPercentage: number(row.commission_percentage ?? row.commissionPercentage), transactionFeePercentage: number(row.transaction_fee_percentage ?? row.transactionFeePercentage), listingFee: number(row.listing_fee ?? row.listingFee), deliverySubsidy: number(row.delivery_subsidy ?? row.deliverySubsidy), advertisingCost: number(row.advertising_cost ?? row.advertisingCost), packagingRequirement: row.packaging_requirement || row.packagingRequirement || '', refundAllowance: number(row.refund_allowance ?? row.refundAllowance), otherCosts: number(row.other_costs ?? row.otherCosts) })),
    meta: { ...(fallback.meta || {}), businessProfileId, status: api.setup_status || fallback.meta?.status || 'draft', onboardingStep: api.onboarding_step || fallback.meta?.onboardingStep || 0, updatedAt: api.updated_at || new Date().toISOString() },
  };
  return profile;
}

export function businessProfilePayload(profile, setupStatus, onboardingStep) {
  const overhead = ['fixed', 'variable', 'periodic'].flatMap((group) => (profile.overhead?.[group] || []).map((row) => ({
    expense_name: row.name || '', expense_category: expenseCategoryCode(row.category), expense_group: group === 'periodic' ? 'Annual or occasional' : 'Regular monthly', amount: number(row.amount), frequency: row.frequency || (group === 'periodic' ? 'Annual' : 'Monthly'), start_date: row.startDate || undefined, notes: row.notes || '',
  })));
  return {
    business_name: profile.identity?.businessName || '', business_description: profile.identity?.description || '', business_category: profile.identity?.category || '', country_code: countryCode(profile.identity?.country), currency_code: currencyCode(profile.identity?.currency), province_or_city: profile.identity?.city || '', business_stage: profile.businessStage?.stage || '', year_started: profile.businessStage?.startYear || profile.businessStage?.plannedStartYear ? number(profile.businessStage.startYear || profile.businessStage.plannedStartYear) : null, monthly_sales_target_units: number(profile.operations?.monthlySalesUnits || profile.operations?.monthlySalesTarget || profile.operations?.monthlyUnitEstimate), setup_status: setupStatus || profile.meta?.status || 'draft', onboarding_step: onboardingStep || profile.meta?.onboardingStep || 1,
    manpower: (profile.manpower || []).map((row) => ({ name_or_role: row.nameOrRole || '', position_name: row.position || '', employment_type: row.employmentType || 'Owner', labor_classification: row.classification || 'Direct labor', pay_type: row.rateType || 'Monthly salary', pay_amount: number(row.amount), working_days_per_month: number(row.workingDays), working_hours_per_day: number(row.workingHours), benefits_and_allowances: number(row.benefits), employer_contributions: number(row.contributions), production_time_percentage: number(row.productionPercent) })),
    owner_labor: { include_owner_pay: profile.ownerLabor?.includeOwnTime === 'Yes', owner_pay_status: profile.ownerLabor?.includeOwnTime === 'Yes' ? 'included' : 'not_included', desired_monthly_owner_pay: number(profile.ownerLabor?.desiredMonthlyCompensation), working_hours_per_month: number(profile.ownerLabor?.workingHoursPerMonth), production_time_percentage: number(profile.ownerLabor?.productionPercent), management_time_percentage: number(profile.ownerLabor?.administrationPercent) },
    overhead, target_market: { customer_groups: profile.targetMarket?.customerGroups || [], most_frequent_customer_group: profile.targetMarket?.frequentGroup || '', typical_age_group: profile.targetMarket?.ageGroup || '', customer_location_type: profile.targetMarket?.locationType || '', main_city_or_area: profile.targetMarket?.customerLocation || '', usual_spending_per_order: number(profile.targetMarket?.spendingPerOrder), purchase_frequency: profile.targetMarket?.purchaseFrequency || '', buying_reasons: profile.targetMarket?.buyingReasons || [], price_sensitivity: profile.targetMarket?.priceSensitivity || '', willingness_to_pay: profile.targetMarket?.willingnessToPay || 0, customer_priorities: profile.targetMarket?.priorities || [] },
    pricing_preferences: { pricing_decision_methods: profile.pricingStrategy?.decisionMethods || [], desired_price_position: profile.pricingStrategy?.pricePosition || '', lowest_usual_price: number(profile.pricingStrategy?.lowestUsualPrice), highest_usual_price: number(profile.pricingStrategy?.highestUsualPrice), profit_plan: profile.pricingStrategy?.profitPlan || '', desired_profit_margin: number(profile.pricingStrategy?.desiredProfitMargin), discount_practice: profile.pricingStrategy?.discountPractice || '', biggest_discount: profile.pricingStrategy?.biggestDiscount || '', selling_type: profile.pricingStrategy?.sellingType || '', usual_retail_price: number(profile.pricingStrategy?.retailPrice), usual_wholesale_price: number(profile.pricingStrategy?.wholesalePrice), minimum_wholesale_order: number(profile.pricingStrategy?.minimumWholesaleOrder) },
    sales_channels: (profile.salesChannels || []).map((row) => ({ channel_name: row.name || '', commission_percentage: number(row.commissionPercentage), transaction_fee_percentage: number(row.transactionFeePercentage), listing_fee: number(row.listingFee), delivery_subsidy: number(row.deliverySubsidy), advertising_cost: number(row.advertisingCost), refund_allowance: number(row.refundAllowance), other_costs: number(row.otherCosts), packaging_requirement: row.packagingRequirement || '' })),
  };
}
