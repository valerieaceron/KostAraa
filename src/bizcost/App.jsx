import { useMemo, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import Layout from './components/Layout';
import { Button, Card, Input } from './components/ui';
import Account from './pages/Account';
import Calculator from './pages/Calculator';
import Dashboard from './pages/Dashboard';
import HelpDesk from './pages/HelpDesk';
import Inventory from './pages/Inventory';
import ProductsServices from './pages/ProductsServices';
import Recommendations from './pages/Recommendations';
import { blankProduct } from './data/demoData';
import { buildSavedItem, calculateProduct, savedItemToProduct } from './utils/calculations';
import { loadState, saveBusiness, saveInventory, saveProduct, saveSavedItems } from './utils/storage';

const defaultBusinessLabor = { staffCount: 0, monthlyCost: 0, workingDays: 0, outputPerDay: 0 };
const defaultBusinessOverhead = { rent: 0, utilities: 0, miscellaneous: 0 };
const accessPassword = '@dmin';
const accessKey = 'bizcost.accessGranted';

function withBusinessCosts(product, business) {
  return {
    ...product,
    labor: { ...defaultBusinessLabor, ...(business.labor || {}) },
    overhead: { ...defaultBusinessOverhead, ...(business.overhead || {}) },
  };
}

function AccessGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (password === accessPassword) {
      window.sessionStorage.setItem(accessKey, 'true');
      onUnlock();
      return;
    }
    setError('Incorrect password. Please try again.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center dotted-canvas p-4">
      <Card className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-white"><LockKeyhole className="h-6 w-6" /></span>
          <div>
            <h1 className="text-2xl font-black text-navy">BizCost</h1>
            <p className="text-sm text-slate-500">Private access required.</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <Input label="Access password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
          {error ? <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}
          <Button className="w-full" type="submit">Try Demo</Button>
        </form>
      </Card>
    </main>
  );
}

export default function App() {
  const initial = loadState();
  const initialBusiness = {
    ...initial.business,
    labor: { ...defaultBusinessLabor, ...(initial.business.labor || initial.product.labor || {}) },
    overhead: { ...defaultBusinessOverhead, ...(initial.business.overhead || initial.product.overhead || {}) },
  };
  const [accessGranted, setAccessGranted] = useState(window.sessionStorage.getItem(accessKey) === 'true');
  const [page, setPage] = useState('dashboard');
  const [business, setBusiness] = useState(initialBusiness);
  const [product, setProductState] = useState(withBusinessCosts(initial.product, initialBusiness));
  const [inventory, setInventoryState] = useState(initial.inventory);
  const [savedItems, setSavedItems] = useState(initial.savedItems);
  const [editingItemId, setEditingItemId] = useState(null);
  const results = useMemo(() => calculateProduct(product, inventory), [product, inventory]);

  const logout = () => {
    window.sessionStorage.removeItem(accessKey);
    setAccessGranted(false);
  };

  const unlockAccess = () => setAccessGranted(true);

  const setProduct = (nextProduct) => {
    setProductState(nextProduct);
    saveProduct(nextProduct);
  };

  const setInventory = (nextInventory) => {
    setInventoryState(nextInventory);
    saveInventory(nextInventory);
  };

  const handleBusinessSave = (nextBusiness) => {
    const syncedBusiness = {
      ...nextBusiness,
      labor: { ...defaultBusinessLabor, ...(nextBusiness.labor || {}) },
      overhead: { ...defaultBusinessOverhead, ...(nextBusiness.overhead || {}) },
    };
    const syncedProduct = withBusinessCosts(product, syncedBusiness);
    setBusiness(syncedBusiness);
    saveBusiness(syncedBusiness);
    setProductState(syncedProduct);
    saveProduct(syncedProduct);
  };

  const persistSavedItems = (items) => {
    setSavedItems(items);
    saveSavedItems(items);
  };

  const getBlankCalculation = (sourceProduct = product) => ({
    ...blankProduct,
    ingredients: blankProduct.ingredients.map((item) => ({ ...item, id: crypto.randomUUID() })),
    packaging: blankProduct.packaging.map((item) => ({ ...item, id: crypto.randomUUID() })),
    otherCosts: { ...blankProduct.otherCosts },
    labor: { ...defaultBusinessLabor, ...(business.labor || sourceProduct.labor || blankProduct.labor) },
    overhead: { ...defaultBusinessOverhead, ...(business.overhead || sourceProduct.overhead || blankProduct.overhead) },
  });

  const saveLibraryItem = (metadata, statusOverride) => {
    const existing = savedItems.find((item) => item.id === editingItemId);
    const payload = buildSavedItem(product, results, business, { ...metadata, status: statusOverride || metadata.status }, existing);
    const nextItems = existing ? savedItems.map((item) => (item.id === existing.id ? payload : item)) : [payload, ...savedItems];
    persistSavedItems(nextItems);
    setProduct(getBlankCalculation());
    setEditingItemId(null);
    return payload;
  };

  const editItemCosting = (item) => {
    const nextProduct = withBusinessCosts(savedItemToProduct(item, inventory), business);
    setProduct(nextProduct);
    setEditingItemId(item.id);
    setPage('calculator');
  };

  const duplicateItem = (item) => {
    const sourceProduct = savedItemToProduct(item, inventory);
    const sourceResults = calculateProduct(sourceProduct, inventory);
    const copy = buildSavedItem(
      { ...sourceProduct, productName: `${item.productName} Copy` },
      sourceResults,
      business,
      { itemType: item.itemType, category: item.category, status: 'Draft', notes: item.notes }
    );
    persistSavedItems([copy, ...savedItems]);
    return copy;
  };

  const archiveItem = (id) => {
    persistSavedItems(savedItems.map((item) => (item.id === id ? { ...item, status: 'Archived', updatedAt: new Date().toISOString() } : item)));
  };

  const deleteItem = (id) => {
    persistSavedItems(savedItems.filter((item) => item.id !== id));
    if (editingItemId === id) setEditingItemId(null);
  };

  const updateSavedItem = (id, updates) => {
    persistSavedItems(savedItems.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item)));
  };

  const resetCalculator = () => {
    setProduct(getBlankCalculation());
    setEditingItemId(null);
  };

  if (!accessGranted) return <AccessGate onUnlock={unlockAccess} />;

  const pages = {
    dashboard: <Dashboard business={business} savedItems={savedItems} inventory={inventory} setPage={setPage} />,
    inventory: <Inventory inventory={inventory} setInventory={setInventory} />,
    calculator: <Calculator product={product} setProduct={setProduct} results={results} inventory={inventory} business={business} onSaveItem={saveLibraryItem} onDuplicateCurrent={() => duplicateItem(buildSavedItem(product, results, business, { itemType: 'Product', category: 'Other', status: 'Draft' }))} onReset={resetCalculator} editingItem={savedItems.find((item) => item.id === editingItemId)} />,
    products: <ProductsServices items={savedItems} onViewEdit={editItemCosting} onDuplicate={duplicateItem} onArchive={archiveItem} onDelete={deleteItem} onUpdateItem={updateSavedItem} setPage={setPage} />,
    recommendations: <Recommendations business={business} savedItems={savedItems} />,
    account: <Account business={business} onSave={handleBusinessSave} />,
    help: <HelpDesk />,
  };

  return (
    <Layout page={page} setPage={setPage} onLogout={logout}>
      {pages[page]}
    </Layout>
  );
}
