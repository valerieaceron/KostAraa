import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Megaphone, RotateCcw, Target, TrendingUp } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { formatCurrency, formatNumber } from '../utils/calculations';

const overheadLabels = {
  rent: 'Rent',
  staff: 'Staff',
  utilities: 'Utilities',
  misc: 'Misc/Others',
};

const pieColors = ['#14b8a6', '#0f172a', '#64748b', '#f97316', '#94a3b8'];

const marketBehaviors = [
  {
    id: 'low',
    title: 'Low-Paying Market',
    description: 'Price-sensitive customers. Lower margin is acceptable if volume is high.',
    badges: ['Volume-focused', 'Low margin'],
    margin: '15%',
    minimumMargin: 15,
    strategy: 'Bundles + promos',
  },
  {
    id: 'mid',
    title: 'Mid-Market',
    description: 'Balanced pricing. Focus on value and consistency.',
    badges: ['Balanced pricing', 'Steady growth'],
    margin: '25%',
    minimumMargin: 25,
    strategy: 'Value + consistency',
  },
  {
    id: 'high',
    title: 'High-Paying Market',
    description: 'Premium customers. Higher margin and stronger branding expected.',
    badges: ['Premium margin', 'Brand-led'],
    margin: '50%',
    minimumMargin: 50,
    strategy: 'Premium + trust',
  },
];

function statusTone(status) {
  if (status === 'Healthy' || status === 'Manageable' || status === 'Enough') return 'good';
  if (status === 'Warning' || status === 'Needs Review' || status === 'Tight' || status === 'Monitor') return 'warn';
  if (status === 'Risky' || status === 'Not Enough') return 'risk';
  return 'neutral';
}

function productName(item) {
  const name = String(item?.productName || '').trim();
  return name && name.toLowerCase() !== 'untitled item' ? name : 'Unnamed Product';
}

function getMaterialsAndPackagingCost(item) {
  const materials = (item.materials || []).reduce((sum, row) => sum + (Number(row.computedCost) || 0), 0);
  const packaging = (item.packagingMaterials || []).reduce((sum, row) => sum + (Number(row.computedCost) || 0), 0);
  return materials + packaging;
}

function getDefaults(activeItems, business = {}) {
  const source = activeItems[0] || {};
  const businessLabor = business.labor || {};
  const businessOverhead = business.overhead || {};
  const staffCount = Number(businessLabor.staffCount) || Number(business.employees) || 0;
  const monthlyLabor = Number(businessLabor.monthlyCost) || 0;
  const accountMonthlyCapacity = (Number(businessLabor.workingDays) || 0) * (Number(businessLabor.outputPerDay) || 0);
  const targetUnits = accountMonthlyCapacity || Number(source.expectedMonthlySales) || 0;
  const averageOrderValue = Number(source.sellingPrice) || 0;

  return {
    overhead: {
      rent: Number(businessOverhead.rent) || 0,
      staff: monthlyLabor,
      utilities: Number(businessOverhead.utilities) || 0,
      misc: Number(businessOverhead.miscellaneous) || 0,
    },
    salesVolume: targetUnits,
    manpower: {
      staffCount,
      salaryPerStaff: staffCount > 0 ? monthlyLabor / staffCount : 0,
      workingHours: 8,
      minutesPerItem: 15,
      workingDays: Number(businessLabor.workingDays) || 0,
    },
    traffic: {
      targetMonthlySales: Number((targetUnits * averageOrderValue).toFixed(2)),
      averageOrderValue,
      conversionRate: 2,
      operatingDays: Number(businessLabor.workingDays) || 0,
    },
  };
}

function NumberInput({ label, value, onChange, prefix, suffix }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-teal-100">
        {prefix ? <span className="text-xs font-bold text-slate-500">{prefix}</span> : null}
        <input className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy outline-none" min="0" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <span className="text-xs font-bold text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

function CurrencyInput({ label, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-navy outline-none focus:border-accent focus:ring-2 focus:ring-teal-100"
        inputMode="decimal"
        value={focused ? String(Number(value) || 0) : formatCurrency(Number(value) || 0)}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onChange={(event) => onChange(Number(event.target.value.replace(/[^0-9.-]/g, '')) || 0)}
      />
    </label>
  );
}

function InsightCard({ title, value, helper, tone = 'neutral', icon: Icon }) {
  const toneClass = tone === 'good'
    ? 'border-teal-100 bg-teal-50 text-accent'
    : tone === 'warn'
      ? 'border-orange-100 bg-orange-50 text-orange-700'
      : tone === 'risk'
        ? 'border-rose-100 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-white text-navy';

  return (
    <Card className={`p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0" /> : null}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-lg font-bold leading-6">{value}</p>
          {helper ? <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{helper}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl font-bold leading-tight text-navy">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function EmptyState({ children }) {
  return <p className="rounded-md bg-slate-50 px-3 py-8 text-center text-sm font-semibold text-slate-500">{children}</p>;
}

function Metric({ label, value, tone = 'neutral' }) {
  const color = tone === 'good' ? 'text-accent' : tone === 'warn' ? 'text-orange-700' : tone === 'risk' ? 'text-rose-600' : 'text-navy';
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Recommendations({ business, savedItems }) {
  const activeItems = savedItems.filter((item) => item.status !== 'Archived');
  const defaults = useMemo(() => getDefaults(activeItems, business), [activeItems, business]);
  const [overhead, setOverhead] = useState(defaults.overhead);
  const [salesVolume, setSalesVolume] = useState(defaults.salesVolume);
  const [manpower, setManpower] = useState(defaults.manpower);
  const [traffic, setTraffic] = useState(defaults.traffic);
  const [marketBehavior, setMarketBehavior] = useState('mid');
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [dailyOutputDecrease, setDailyOutputDecrease] = useState(0);
  const selectedMarket = marketBehaviors.find((behavior) => behavior.id === marketBehavior) || marketBehaviors[1];

  const averageSellingPrice = activeItems.length
    ? activeItems.reduce((sum, item) => sum + (Number(item.sellingPrice) || Number(item.suggestedSellingPrice) || 0), 0) / activeItems.length
    : Number(traffic.averageOrderValue) || 0;
  const simulatedOverhead = { ...overhead };
  const smartStaffCount = Number(manpower.staffCount) || 0;
  const smartWorkingHours = Number(manpower.workingHours) || 8;
  const smartMinutesPerItem = Number(manpower.minutesPerItem) || 15;
  const manpowerDerivedDailyCapacity = smartStaffCount > 0 ? (smartStaffCount * smartWorkingHours * 60) / smartMinutesPerItem : 0;
  const baselineDailyOutput = Number(business?.labor?.outputPerDay) || manpowerDerivedDailyCapacity;
  const simulatedDailyOutput = Math.max(0, baselineDailyOutput - dailyOutputDecrease);
  const accountWorkingDays = Number(business?.labor?.workingDays) || 0;
  const simulatedMonthlyCapacity = accountWorkingDays * simulatedDailyOutput;
  const dailyTargetSales = accountWorkingDays > 0 ? salesVolume / accountWorkingDays : 0;
  const achievableSalesVolume = simulatedMonthlyCapacity > 0 ? Math.min(salesVolume, simulatedMonthlyCapacity) : salesVolume;
  const capacityShortfall = Math.max(0, salesVolume - simulatedMonthlyCapacity);
  const totalOverhead = Object.values(simulatedOverhead).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const projectedMonthlySales = achievableSalesVolume * averageSellingPrice;
  const maximumCapacityRevenue = simulatedMonthlyCapacity * averageSellingPrice;
  const overheadPercent = projectedMonthlySales > 0 ? (totalOverhead / projectedMonthlySales) * 100 : 0;
  const overheadStatus = overheadPercent > 30 ? 'Needs Review' : overheadPercent >= 20 ? 'Monitor' : overheadPercent > 0 ? 'Manageable' : 'No data';
  const highestOverhead = Object.entries(simulatedOverhead).sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0] || ['rent', 0];
  const highestOverheadPercent = totalOverhead > 0 ? ((Number(highestOverhead[1]) || 0) / totalOverhead) * 100 : 0;
  const averageGrossProfit = activeItems.length ? activeItems.reduce((sum, item) => sum + (Number(item.grossProfit) || 0), 0) / activeItems.length : 0;
  const breakEvenUnits = averageGrossProfit > 0 ? Math.ceil(totalOverhead / averageGrossProfit) : null;
  const expectedProfitAfterOverhead = averageGrossProfit * achievableSalesVolume - totalOverhead;
  const overheadPerUnit = salesVolume > 0 ? totalOverhead / salesVolume : 0;

  const updateOverhead = (field, value) => {
    const nextOverhead = { ...overhead, [field]: Number(value) };
    setOverhead(nextOverhead);
  };

  const updateManpower = (field, value) => {
    const nextManpower = { ...manpower, [field]: Number(value) };
    setManpower(nextManpower);
  };

  const profitRows = activeItems.map((item) => {
    const materialCost = getMaterialsAndPackagingCost(item);
    const sellingPrice = Number(item.sellingPrice) || Number(item.suggestedSellingPrice) || 0;
    const usesOverride = Boolean(item.operationalOverride?.enabled);
    const operationalCost = usesOverride
      ? (Number(item.operationalOverride.laborCostPerUnit) || 0) + (Number(item.operationalOverride.overheadCostPerUnit) || 0)
      : overheadPerUnit;
    const trueCost = materialCost + operationalCost;
    const profit = sellingPrice - trueCost;
    const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const volumeOkay = marketBehavior === 'low' && salesVolume >= (breakEvenUnits || Infinity);
    const status = profit <= 0 ? 'Risky' : margin >= selectedMarket.minimumMargin || volumeOkay ? 'Healthy' : 'Warning';
    return { item, name: productName(item), materialCost, overheadPerUnit: operationalCost, trueCost, sellingPrice, profit, margin, status, usesOverride };
  });
  const highestProfit = [...profitRows].sort((a, b) => b.profit - a.profit)[0];
  const lowestProfit = [...profitRows].sort((a, b) => a.profit - b.profit)[0];
  const losingRows = profitRows.filter((row) => row.profit < 0);
  const baselineOverheadTotal = Object.values(defaults.overhead).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const baselineBreakEvenUnits = averageGrossProfit > 0 ? Math.ceil(baselineOverheadTotal / averageGrossProfit) : 0;
  const overheadChanges = Object.keys(overheadLabels).map((key) => ({
    key,
    label: overheadLabels[key],
    baseline: Number(defaults.overhead[key]) || 0,
    simulated: Number(simulatedOverhead[key]) || 0,
    delta: (Number(simulatedOverhead[key]) || 0) - (Number(defaults.overhead[key]) || 0),
  }));
  const biggestChange = [...overheadChanges].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const isOverheadBaseline = overheadChanges.every((change) => Math.abs(change.delta) < 0.01);
  const baselineHighest = Object.entries(defaults.overhead).sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))[0] || ['rent', 0];
  const baselineHighestPercent = baselineOverheadTotal ? ((Number(baselineHighest[1]) || 0) / baselineOverheadTotal) * 100 : 0;
  const scenarioRecommendation = isOverheadBaseline
    ? `✅ Current Baseline Profile: Your overhead is anchored to your Account defaults. ${overheadLabels[baselineHighest[0]] || 'Your highest category'} remains the largest fixed cost driver at ${formatNumber(baselineHighestPercent)}% of total expenses. Try reducing any category by 10% to see how it changes profitability.`
    : biggestChange?.delta < 0
      ? `💡 Action Plan: Reducing ${biggestChange.label.toLowerCase()} to ${formatCurrency(biggestChange.simulated)} lowers your break-even point from ${formatNumber(baselineBreakEvenUnits)} units to ${formatNumber(breakEvenUnits || 0)} units. If this scenario becomes real, update the Account page to lock in the improved baseline.`
      : `⚠️ Risk Warning: Simulated ${biggestChange?.label.toLowerCase()} is ${formatCurrency(biggestChange?.delta || 0)} above your verified Account baseline. At this threshold, ${losingRows.length} product${losingRows.length === 1 ? '' : 's'} fall below zero profit.${lowestProfit ? ` Consider a temporary ${formatCurrency(Math.max(5, Math.ceil(Math.max(0, -lowestProfit.profit) / 5) * 5))} surcharge on lower-margin items such as ${lowestProfit.name}.` : ''}`;
  const needsReview = activeItems.filter((item) => {
    const margin = Number(item.profitMargin) || 0;
    const volumeOkay = marketBehavior === 'low' && salesVolume >= (breakEvenUnits || Infinity);
    return item.status === 'Needs Review' || item.redFlags?.length || Number(item.suggestedSellingPrice) > Number(item.sellingPrice) || (margin < selectedMarket.minimumMargin && !volumeOkay);
  });
  const riskLevel = expectedProfitAfterOverhead < 0 || losingRows.length ? 'Risky' : overheadStatus === 'Needs Review' || needsReview.length ? 'Needs Review' : 'Manageable';

  const overheadData = [
    { name: 'Rent', value: Number(simulatedOverhead.rent) || 0 },
    { name: 'Staff', value: Number(simulatedOverhead.staff) || 0 },
    { name: 'Utilities', value: Number(simulatedOverhead.utilities) || 0 },
    { name: 'Misc/Others', value: Number(simulatedOverhead.misc) || 0 },
  ].filter((item) => item.value > 0);

  const salesMax = Math.max(100, simulatedMonthlyCapacity * 1.5, salesVolume * 1.25, breakEvenUnits ? breakEvenUnits * 2 : 0);
  const salesInsight = capacityShortfall > 0
    ? `Your goal exceeds production capacity by ${formatNumber(capacityShortfall)} units. Revenue is capped at ${formatCurrency(maximumCapacityRevenue)} unless you increase daily output, add working days, or expand capacity.`
    : projectedMonthlySales > 0
    ? `This goal is within capacity. At ${formatCurrency(projectedMonthlySales)} achievable monthly sales, expected profit after overhead is ${formatCurrency(expectedProfitAfterOverhead)}.`
    : 'Set a sales target so BizCost can estimate profit after overhead.';
  const overheadInsight = totalOverhead
    ? `${overheadLabels[highestOverhead[0]]} is the biggest cost driver at ${formatNumber(highestOverheadPercent)}%. ${overheadPercent > 30 ? 'Review this before lowering prices.' : 'Keep it monitored as sales grow.'}`
    : 'Add overhead data to see what is driving monthly cost.';
  const marketingInsight = marketBehavior === 'low'
    ? 'For a low-paying market, lower margin can work only with strong volume, bundles, and fast-moving products.'
    : marketBehavior === 'high'
      ? 'For a high-paying market, protect margins with premium pricing, branding, and stronger trust signals.'
      : 'For mid-market buyers, balance price, value, and consistent offers.';
  const mainProblem = expectedProfitAfterOverhead < 0
    ? `Net loss detected after overhead: ${formatCurrency(Math.abs(expectedProfitAfterOverhead))}.`
    : losingRows.length
    ? `${losingRows.length} product${losingRows.length === 1 ? ' is' : 's are'} losing money after overhead.`
    : overheadStatus === 'Needs Review'
      ? `Overhead is ${formatNumber(overheadPercent)}% of projected sales.`
      : activeItems.length
        ? 'No major loss detected after overhead.'
        : 'No saved product data yet.';
  const topRecommendation = losingRows.length
    ? `Review pricing for ${losingRows.slice(0, 2).map((row) => row.name).join(', ')}.`
    : overheadStatus === 'Needs Review'
      ? `Reduce ${overheadLabels[highestOverhead[0]]?.toLowerCase()} or increase sales volume.`
      : needsReview.length
        ? `${selectedMarket.title}: review margins below ${selectedMarket.margin}.`
      : highestProfit
        ? `Push ${highestProfit.name}; it has the strongest profit after overhead.`
        : 'Save a product calculation first.';
  const strategySummary = marketBehavior === 'low' && breakEvenUnits && salesVolume < breakEvenUnits
    ? `You selected Low-Paying Market, but your sales volume is too low to cover fixed costs. Lower overhead or consider Mid-Market pricing to increase margins. You need at least ${formatNumber(breakEvenUnits)} units to reach break-even.`
    : marketBehavior === 'high' && profitRows.some((row) => row.margin < 50)
      ? `Your prices are currently set too low for a Premium Strategy. Raise selling prices until products reach the 50% target margin, then reallocate part of the budget to premium branding.`
      : `${selectedMarket.title} alignment: ${profitRows.filter((row) => row.status === 'Healthy').length} of ${profitRows.length} products currently meet the ${selectedMarket.minimumMargin}% target margin after overhead.`;

  const staffCount = Number(manpower.staffCount) || 0;
  const salaryPerStaff = Number(manpower.salaryPerStaff) || 0;
  const workingHours = Number(manpower.workingHours) || 0;
  const minutesPerItem = Number(manpower.minutesPerItem) || 0;
  const workingDays = Number(manpower.workingDays) || 0;
  const manpowerReady = staffCount > 0 && workingHours > 0 && minutesPerItem > 0 && workingDays > 0 && salesVolume > 0;
  const workingMinutesPerDay = staffCount * workingHours * 60;
  const dailyCapacity = manpowerReady ? workingMinutesPerDay / minutesPerItem : 0;
  const monthlyCapacity = manpowerReady ? dailyCapacity * workingDays : 0;
  const requiredDailyOutput = manpowerReady ? salesVolume / workingDays : 0;
  const utilizationRate = dailyCapacity > 0 ? (requiredDailyOutput / dailyCapacity) * 100 : 0;
  const totalMonthlySalary = staffCount * salaryPerStaff;
  const laborCostPerItem = monthlyCapacity > 0 ? totalMonthlySalary / monthlyCapacity : 0;
  const manpowerStatus = !manpowerReady
    ? 'Needs setup'
    : monthlyCapacity >= salesVolume
      ? 'Enough'
      : monthlyCapacity >= salesVolume * 0.8
        ? 'Tight'
        : 'Not Enough';
  const manpowerInsight = !manpowerReady
    ? 'Complete manpower inputs to view capacity.'
    : manpowerStatus === 'Enough'
    ? 'Your manpower can support your target sales. No need to hire yet.'
    : manpowerStatus === 'Tight'
      ? 'Your capacity is close to the target. Watch delays and batching.'
      : 'Target sales need more production capacity. Add staff or reduce prep time.';

  const targetMonthlySales = Number(traffic.targetMonthlySales) || projectedMonthlySales || 0;
  const averageOrderValue = Number(traffic.averageOrderValue) || 0;
  const conversionRate = Number(traffic.conversionRate) || 0;
  const operatingDays = Number(traffic.operatingDays) || 0;
  const trafficValidation = targetMonthlySales <= 0
    ? 'Enter sales target.'
    : averageOrderValue <= 0
      ? 'Enter average order value.'
      : conversionRate <= 0
        ? 'Enter conversion rate.'
        : operatingDays <= 0
          ? 'Enter operating days.'
          : '';
  const customersNeededPerDay = trafficValidation ? 0 : targetMonthlySales / averageOrderValue / operatingDays;
  const footTrafficNeeded = trafficValidation ? 0 : customersNeededPerDay / (conversionRate / 100);
  const trafficInsight = trafficValidation || (marketBehavior === 'low'
    ? `Aim for around ${formatNumber(footTrafficNeeded)} people passing by per day. Promos and volume matter.`
    : marketBehavior === 'high'
      ? `You may need fewer customers, but branding and trust must be stronger.`
      : `Maintain conversion and repeat buyers to reach ${formatCurrency(targetMonthlySales)} monthly sales.`);

  const reset = () => {
    setOverhead(defaults.overhead);
    setSalesVolume(defaults.salesVolume);
    setManpower(defaults.manpower);
    setTraffic(defaults.traffic);
    setMarketBehavior('mid');
    setDailyOutputDecrease(0);
  };
  const openReviewChecklist = () => {
    setShowProductDetails(true);
    window.setTimeout(() => document.getElementById('product-health-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">Business Health Simulator</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Simulate changes to your expenses, market selection, and capacity to see instant impacts on your bottom line.</p>
        </div>
        <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset All</Button>
      </div>

      <section className="rounded-lg border border-teal-100 bg-teal-50/70 p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-accent">
              <Megaphone className="h-5 w-5" />
            </span>
            <SectionTitle title="Marketing Behavior" subtitle="Choose how your target customers usually buy. This guides margin and growth recommendations." />
          </div>
          <Badge tone="good">{selectedMarket.margin} target margin</Badge>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 lg:grid-cols-3">
            {marketBehaviors.map((behavior) => {
              const selected = marketBehavior === behavior.id;
              return (
                <button
                  key={behavior.id}
                  className={`relative rounded-md border p-4 text-left transition ${selected ? 'border-teal-300 bg-white shadow-soft ring-2 ring-teal-100' : 'border-teal-100 bg-white/80 hover:border-accent'}`}
                  onClick={() => setMarketBehavior(behavior.id)}
                  type="button"
                >
                  {selected ? <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-accent" /> : null}
                  <p className="pr-8 font-bold text-navy">{behavior.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">{behavior.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {behavior.badges.map((badge) => <Badge key={badge} tone={selected ? 'good' : 'neutral'}>{badge}</Badge>)}
                  </div>
                </button>
              );
            })}
          </div>
          <Card className="border-teal-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your Selection</p>
            <p className="mt-2 text-lg font-bold text-navy">{selectedMarket.title}</p>
            <div className="mt-4 grid gap-2">
              <Metric label="Recommended Margin" value={selectedMarket.margin} tone="good" />
              <Metric label="Strategy" value={selectedMarket.strategy} />
            </div>
            <p className="mt-3 text-sm font-semibold leading-5 text-slate-600">{marketingInsight}</p>
          </Card>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <SectionTitle title="📊 Overhead Expenses: What's the Problem?" subtitle="See which monthly cost is pulling profit down and test alternative scenarios." />
        </div>
        <div className="px-5 pt-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {overheadData.map((entry, index) => (
              <span key={entry.name} style={{ width: `${totalOverhead ? (entry.value / totalOverhead) * 100 : 0}%`, backgroundColor: pieColors[index % pieColors.length] }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {overheadData.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />{entry.name} {formatCurrency(entry.value)}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(overheadLabels).map(([key, label]) => {
              const baseline = Number(defaults.overhead[key]) || 0;
              const maxValue = baseline > 0 ? baseline * 1.5 : 10000;
              const stepValue = Math.max(1, Math.round(maxValue / 100));
              const changed = Math.abs((Number(overhead[key]) || 0) - baseline) >= 0.01;
              return (
                <div key={key} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-navy">{key === 'rent' ? '🏠' : key === 'utilities' ? '⚡' : key === 'staff' ? '👥' : '📦'} {label}</p>
                    <span className="text-sm font-black text-navy">{formatCurrency(overhead[key])}</span>
                  </div>
                  {key === 'misc' ? (
                    <div className="mt-4 flex items-center gap-2">
                      <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 font-black text-slate-600" onClick={() => updateOverhead(key, Math.max(0, (Number(overhead[key]) || 0) - stepValue))} type="button">−</button>
                      <input aria-label={`${label} simulated value`} className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-center text-sm font-bold text-navy outline-none focus:border-accent" min="0" type="number" value={overhead[key]} onChange={(event) => updateOverhead(key, Number(event.target.value))} />
                      <button className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 font-black text-slate-600" onClick={() => updateOverhead(key, (Number(overhead[key]) || 0) + stepValue)} type="button">+</button>
                    </div>
                  ) : (
                    <>
                      <input aria-label={`${label} simulated value`} className="mt-4 h-2 w-full accent-teal-500" min={baseline * 0.5} max={maxValue} step={stepValue} type="range" value={overhead[key]} onChange={(event) => updateOverhead(key, Number(event.target.value))} />
                      <div className="mt-2 flex justify-between text-xs font-bold text-slate-400"><span>−50%</span><span title={`Saved Account baseline: ${formatCurrency(baseline)}`}>Baseline</span><span>+50%</span></div>
                    </>
                  )}
                  {changed ? <p className="mt-3 text-xs italic text-slate-400">Saved Baseline: {formatCurrency(baseline)} (from Account)</p> : null}
                </div>
              );
            })}
          </div>
          <div className="h-fit rounded-md border border-teal-100 bg-teal-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Real-time Impact</p>
            <div className="mt-3 grid gap-3">
              <Metric label="Total Simulated Overhead" value={`${formatCurrency(totalOverhead)} / month`} />
              <Metric label="Overhead % of Projected Sales" value={`${formatNumber(overheadPercent)}%`} tone={overheadStatus === 'Needs Review' ? 'warn' : 'good'} />
              <Metric label="Overhead Cost / Unit" value={formatCurrency(overheadPerUnit)} />
              <Metric label="Break-even Units" value={formatNumber(breakEvenUnits || 0)} tone={overheadStatus === 'Needs Review' ? 'warn' : 'neutral'} />
            </div>
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setOverhead(defaults.overhead)}><RotateCcw className="h-4 w-4" /> Reset to Account Defaults</Button>
          </div>
        </div>
        <div className={`border-t px-5 py-4 text-sm font-semibold leading-6 ${isOverheadBaseline ? 'border-teal-100 bg-teal-50 text-teal-800' : biggestChange?.delta < 0 ? 'border-sky-100 bg-sky-50 text-sky-800' : 'border-orange-100 bg-orange-50 text-orange-800'}`}>
          <p className="text-xs font-black uppercase tracking-wide">Owner's Insight</p>
          <p className="mt-1">{scenarioRecommendation}</p>
        </div>
      </section>

      <Card className="p-4">
        <SectionTitle title="Sales Scenario: Set Your Goal" subtitle="Test target sales and production capacity together to see how unit costs and profit change." />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="relative pt-8">
              <div className="absolute top-0 -translate-x-1/2 rounded-md border border-teal-100 bg-white px-2 py-1 text-xs font-bold text-accent shadow-soft" style={{ left: `${salesMax > 0 ? Math.min(100, (salesVolume / salesMax) * 100) : 0}%` }}>
                {formatNumber(salesVolume)} units
              </div>
              <input className="h-2 w-full accent-teal-500" max={salesMax} min="0" step="10" type="range" value={salesVolume} onChange={(event) => setSalesVolume(Number(event.target.value))} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
              <span>Low Sales</span>
              <span>Break-even</span>
              <span>Target Sales</span>
              <span>Growth Goal</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Target Units" value={formatNumber(salesVolume)} />
              <Metric label="Daily Target Sales" value={`${formatNumber(dailyTargetSales)} units/day`} tone={capacityShortfall > 0 ? 'risk' : 'good'} />
              <Metric label="Maximum Capacity Revenue" value={formatCurrency(maximumCapacityRevenue)} tone="good" />
              <Metric label="Achievable Revenue" value={formatCurrency(projectedMonthlySales)} tone={capacityShortfall > 0 ? 'warn' : 'good'} />
              <Metric label="Break-even Units" value={breakEvenUnits ? formatNumber(breakEvenUnits) : 'No data'} tone={breakEvenUnits && achievableSalesVolume >= breakEvenUnits ? 'good' : breakEvenUnits ? 'warn' : 'neutral'} />
              <Metric label="Capacity Gap" value={capacityShortfall > 0 ? `${formatNumber(capacityShortfall)} units over` : 'Within capacity'} tone={capacityShortfall > 0 ? 'risk' : 'good'} />
            </div>
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-bold text-navy">
                <span>Adjust Daily Production Capacity</span>
                <span>{formatNumber(dailyOutputDecrease)} units</span>
              </div>
              <input aria-label="Adjust Daily Production Capacity" className="mt-3 h-2 w-full accent-teal-500" min="0" max={Math.max(1, baselineDailyOutput)} step="1" type="range" value={dailyOutputDecrease} onChange={(event) => setDailyOutputDecrease(Number(event.target.value))} />
              <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Account baseline: {formatNumber(baselineDailyOutput)} units/day</span>
                <span>Simulated capacity: {formatNumber(simulatedMonthlyCapacity)} units/month</span>
              </div>
            </div>
          </div>
          <div>
            <InsightCard title={capacityShortfall > 0 ? 'Production Capacity Warning' : 'Sales Capacity Check'} value={salesInsight} helper={capacityShortfall > 0 ? 'Achievable revenue is capped at maximum production while the gap remains visible.' : 'Adjust target units to test a realistic growth plan.'} tone={capacityShortfall > 0 || expectedProfitAfterOverhead < 0 ? 'warn' : 'good'} />
            {capacityShortfall > 0 ? (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-black text-rose-700">Target exceeds capacity by {formatNumber(capacityShortfall)} units.</p>
                <div className="mt-3 flex gap-2">
                  <Button className="min-h-9 flex-1 px-3 py-1.5" onClick={() => updateManpower('staffCount', (Number(manpower.staffCount) || 0) + 1)}>Add Staff</Button>
                  <Button variant="ghost" className="min-h-9 flex-1 px-3 py-1.5" onClick={() => updateManpower('workingHours', Math.min(24, (Number(manpower.workingHours) || 8) + 1))}>Adjust Hours</Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionTitle title="Insights Overview" subtitle="Live feedback based on your selected market, expected volume, and overhead." />
        <div className="grid gap-3 lg:grid-cols-4">
          <InsightCard title="Primary Profit Blocker" value={mainProblem} helper={overheadInsight} tone={riskLevel === 'Risky' ? 'risk' : riskLevel === 'Needs Review' ? 'warn' : 'good'} icon={AlertTriangle} />
          <button className="text-left" onClick={openReviewChecklist} type="button">
            <InsightCard title="Risk Level" value={riskLevel === 'Risky' ? 'High Attention Needed' : riskLevel} helper={`View ${needsReview.length}-item review checklist`} tone={statusTone(riskLevel)} />
          </button>
          <InsightCard title="Top Recommendation" value={topRecommendation} helper={marketingInsight} tone="neutral" icon={Target} />
          <InsightCard title="Estimated Profit After Overhead" value={formatCurrency(expectedProfitAfterOverhead)} helper={`${formatNumber(achievableSalesVolume)} achievable of ${formatNumber(salesVolume)} target units`} tone={capacityShortfall > 0 || expectedProfitAfterOverhead < 0 ? 'risk' : expectedProfitAfterOverhead > 0 ? 'good' : 'neutral'} icon={TrendingUp} />
        </div>
      </section>

      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle title="Live Business Health & Strategy Alignment" subtitle={`Product health updates instantly against the ${selectedMarket.minimumMargin}% ${selectedMarket.title} target.`} />
          <Button variant="ghost" className="min-h-9 px-3 py-1.5" onClick={() => setShowProductDetails((current) => !current)}>
            {showProductDetails ? 'Hide Product Details' : 'View Product Details'}
          </Button>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="h-72">
            {profitRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitRows} margin={{ top: 10, right: 12, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `PHP ${formatNumber(value)}`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                    {profitRows.map((row) => <Cell key={row.item.id} fill={row.status === 'Risky' ? '#e11d48' : row.status === 'Warning' ? '#f59e0b' : '#14b8a6'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState>Save a product calculation first so BizCost can analyze your profit after overhead.</EmptyState>}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {profitRows.map((row) => (
                <div key={row.item.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.status === 'Risky' ? 'bg-rose-600' : row.status === 'Warning' ? 'bg-amber-500' : 'bg-teal-500'}`} /><span className="truncate">{row.name}</span></span>
                  <span className="font-bold text-navy">{row.status}</span>
                </div>
              ))}
            </div>
          </div>
          <InsightCard
            title="Insight"
            value={losingRows.length ? `${losingRows.length} product${losingRows.length === 1 ? ' is' : 's are'} losing money after overhead.` : 'No product is losing money after overhead.'}
            helper={losingRows.length ? `Review ${losingRows.slice(0, 2).map((row) => row.name).join(', ')}.` : highestProfit ? `Push ${highestProfit.name}; it has the strongest profit.` : 'Save products first.'}
            tone={losingRows.length ? 'risk' : 'good'}
          />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Metric label="Highest Profit Product" value={highestProfit ? highestProfit.name : 'No data'} tone="good" />
          <Metric label="Lowest Profit Product" value={lowestProfit ? lowestProfit.name : 'No data'} tone={lowestProfit?.profit < 0 ? 'risk' : 'neutral'} />
        </div>
        {showProductDetails ? (
          <div id="product-health-details" className="mt-4 scroll-mt-6 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Material Cost</th>
                  <th className="p-3">Overhead / Unit</th>
                  <th className="p-3">True Cost</th>
                  <th className="p-3">Selling Price</th>
                  <th className="p-3">Profit</th>
                  <th className="p-3">Margin</th>
                  <th className="p-3">Health</th>
                </tr>
              </thead>
              <tbody>
                {profitRows.map((row) => (
                  <tr key={row.item.id} className="border-t border-slate-100">
                    <td className="p-3 font-bold text-navy">{row.name}{row.usesOverride ? <span className="mt-1 block text-xs font-semibold text-orange-700">⚠️ Uses custom operational costs; global changes may not fully apply.</span> : null}</td>
                    <td className="p-3">{formatCurrency(row.materialCost)}</td>
                    <td className="p-3">{formatCurrency(row.overheadPerUnit)}</td>
                    <td className="p-3">{formatCurrency(row.trueCost)}</td>
                    <td className="p-3">{formatCurrency(row.sellingPrice)}</td>
                    <td className={`p-3 font-bold ${row.profit < 0 ? 'text-rose-600' : 'text-navy'}`}>{formatCurrency(row.profit)}</td>
                    <td className="p-3">{formatNumber(row.margin)}%</td>
                    <td className="p-3">
                      <span
                        title={`${row.status}: At a ${selectedMarket.title} target of ${formatNumber(salesVolume)} units, this product's ${formatNumber(row.margin)}% margin is measured after ${formatCurrency(totalOverhead)} monthly overhead (${formatCurrency(row.overheadPerUnit)} per unit).`}
                      >
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Manpower Analysis" subtitle="Simple capacity check for the sales target." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <NumberInput label="Staff Count" value={manpower.staffCount} onChange={(value) => updateManpower('staffCount', value)} />
            <NumberInput label="Salary per Staff" prefix="PHP" value={manpower.salaryPerStaff} onChange={(value) => updateManpower('salaryPerStaff', value)} />
            <NumberInput label="Hours per Day" value={manpower.workingHours} onChange={(value) => updateManpower('workingHours', value)} />
            <NumberInput label="Minutes per Item" value={manpower.minutesPerItem} onChange={(value) => updateManpower('minutesPerItem', value)} />
            <NumberInput label="Operating Days" value={manpower.workingDays} onChange={(value) => updateManpower('workingDays', value)} />
            <Metric label="Target Sales" value={`${formatNumber(salesVolume)} units`} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Labor Cost / Item" value={manpowerReady ? formatCurrency(laborCostPerItem) : '— (Enter manpower specs below)'} />
            <Metric label="Daily Capacity" value={manpowerReady ? `${formatNumber(dailyCapacity)} units` : '— (Enter manpower specs below)'} />
            <Metric label="Required / Day" value={manpowerReady ? `${formatNumber(requiredDailyOutput)} units` : '— (Set staff and operating days)'} />
            <Metric label="Monthly Capacity" value={manpowerReady ? `${formatNumber(monthlyCapacity)} units` : '— (Enter manpower specs below)'} />
            <Metric label="Utilization Rate" value={manpowerReady ? `${formatNumber(utilizationRate)}%` : '— (Complete inputs to calculate)'} tone={utilizationRate >= 91 ? 'risk' : utilizationRate >= 71 ? 'warn' : manpowerReady ? 'good' : 'neutral'} />
            <Metric label="Status" value={manpowerStatus === 'Tight' ? `Capacity: At Limit (${formatNumber(utilizationRate)}%)` : manpowerStatus} tone={statusTone(manpowerStatus)} />
          </div>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">{manpowerInsight}</div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Foot Traffic & Sales Goal" subtitle="Estimate customers and foot traffic needed." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CurrencyInput label="Target Monthly Sales" value={targetMonthlySales} onChange={(value) => setTraffic({ ...traffic, targetMonthlySales: value })} />
            <CurrencyInput label="Average Order Value" value={traffic.averageOrderValue} onChange={(value) => setTraffic({ ...traffic, averageOrderValue: value })} />
            <NumberInput label="Conversion Rate" suffix="%" value={traffic.conversionRate} onChange={(value) => setTraffic({ ...traffic, conversionRate: value })} />
            <NumberInput label="Operating Days / Month" value={traffic.operatingDays} onChange={(value) => setTraffic({ ...traffic, operatingDays: value })} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric label="Customers Needed / Day" value={trafficValidation ? '— (Complete the sales inputs above)' : formatNumber(customersNeededPerDay)} />
            <Metric label="Foot Traffic Needed / Day" value={trafficValidation ? '— (Complete the sales inputs above)' : formatNumber(footTrafficNeeded)} tone={footTrafficNeeded ? 'warn' : 'neutral'} />
          </div>
          <div className="mt-4 rounded-md border border-orange-100 bg-orange-50 p-3 text-sm font-semibold leading-6 text-orange-800">{trafficInsight}</div>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle title="Overall Summary" subtitle="What to do next." />
        <div className="grid gap-3 lg:grid-cols-3">
          <InsightCard title="Strength" value={highestProfit ? `${highestProfit.name} is performing best.` : 'No strength detected yet.'} helper={highestProfit ? `${formatCurrency(highestProfit.profit)} profit after overhead.` : 'Save product costings first.'} tone={highestProfit ? 'good' : 'neutral'} />
          <InsightCard title="Risk" value={losingRows.length ? `${losingRows.length} low-profit product${losingRows.length === 1 ? '' : 's'}.` : overheadStatus === 'Needs Review' ? 'Overhead is high.' : 'No major risk yet.'} helper={losingRows.length ? 'Losses affect total business profit.' : overheadInsight} tone={losingRows.length || overheadStatus === 'Needs Review' ? 'warn' : 'good'} />
          <InsightCard title="Top Priority" value={topRecommendation} helper="Start with the biggest profit blocker." tone="neutral" />
        </div>
      </section>

      <Card className="border-l-4 border-l-accent bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-accent">Contextual Strategy Summary</p>
        <h2 className="mt-2 text-xl font-black text-navy">{selectedMarket.title} × Financial Reality</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{strategySummary}</p>
      </Card>
    </div>
  );
}
