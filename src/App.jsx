import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = {
  bg: '#0a0f1a',
  header: '#0f1623',
  text: '#e8edf5',
  accent: '#4fc3f7',
  inbound: '#2ea043',
  outbound: '#c0392b',
  border: '#1e2a3a'
};

const MISSO_PRODUCTS = {
  'FITBAR-MC-30': { name: 'FITBAR Mango+Cashew 30g', sku: 'FITBAR-MC-30', category: 'FITBAR' },
  'FITBAR-DH-30': { name: 'FITBAR Date+Hazelnut 30g', sku: 'FITBAR-DH-30', category: 'FITBAR' },
  'FITBAR-FH-30': { name: 'FITBAR Fig+Hazelnut 30g', sku: 'FITBAR-FH-30', category: 'FITBAR' },
  'FITBAR-CA-30': { name: 'FITBAR Cranberry+Almond 30g', sku: 'FITBAR-CA-30', category: 'FITBAR' },
  'FITBAR-CUA-30': { name: 'FITBAR Currant+Almond 30g', sku: 'FITBAR-CUA-30', category: 'FITBAR' },
  'BITE-CAC-180': { name: 'Bite Cherry+Almond in Chocolate 180g', sku: 'BITE-CAC-180', category: 'Bite 180g' },
  'BITE-P-180': { name: 'Bite Pistachio 180g', sku: 'BITE-P-180', category: 'Bite 180g' },
  'BITE-TN-180': { name: 'Bite Three Nuts 180g', sku: 'BITE-TN-180', category: 'Bite 180g' },
  'BITE-CAC-45': { name: 'Bite Cherry+Almond in Chocolate 45g', sku: 'BITE-CAC-45', category: 'Bite 45g' },
  'BITE-P-45': { name: 'Bite Pistachio 45g', sku: 'BITE-P-45', category: 'Bite 45g' },
  'BITE-TN-45': { name: 'Bite Three Nuts 45g', sku: 'BITE-TN-45', category: 'Bite 45g' },
  'MANGO-500': { name: 'Mango 500g without sugar', sku: 'MANGO-500', category: 'Mango' },
  'MANGO-250': { name: 'Mango 250g without sugar', sku: 'MANGO-250', category: 'Mango' },
  'MANGO-125': { name: 'Mango in Chocolate 125g', sku: 'MANGO-125', category: 'Mango' }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inbound, setInbound] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
    const subscription = supabase
      .channel('all-tables')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadAllData();
      })
      .subscribe();
    return () => subscription.unsubscribe();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [inboundData, outboundData, stockData, movementData, clientsData] = await Promise.all([
        supabase.from('inbound').select('*').order('created_at', { ascending: false }),
        supabase.from('outbound').select('*').order('created_at', { ascending: false }),
        supabase.from('stock').select('*'),
        supabase.from('movements').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('clients').select('*').order('name', { ascending: true })
      ]);

      if (inboundData.data) setInbound(inboundData.data);
      if (outboundData.data) setOutbound(outboundData.data);
      if (stockData.data) setStock(stockData.data);
      if (movementData.data) setMovements(movementData.data);
      if (clientsData.data) setClients(clientsData.data);
    } catch (err) {
      console.error('Помилка завантаження:', err);
    }
    setLoading(false);
  }

  function getDashboardStats() {
    const totalInbound = inbound.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalOutbound = outbound.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalStock = stock.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const criticalItems = stock.filter(item => item.quantity < 10).length;
    return { totalInbound, totalOutbound, totalStock, criticalItems };
  }

  async function addInbound(formData) {
    try {
      await supabase.from('inbound').insert([formData]);
      await supabase.from('movements').insert([{
        type: 'INBOUND',
        product_sku: formData.product_sku,
        quantity: formData.quantity,
        notes: `Надійшло з України: ${formData.quantity} од.`
      }]);
    } catch (err) {
      console.error('Помилка:', err);
    }
  }

  async function addOutbound(formData) {
    try {
      await supabase.from('outbound').insert([formData]);
      await supabase.from('movements').insert([{
        type: 'OUTBOUND',
        product_sku: formData.product_sku,
        quantity: formData.quantity,
        notes: `Вивезено до ${formData.client}: ${formData.quantity} од.`
      }]);
    } catch (err) {
      console.error('Помилка:', err);
    }
  }

  const stats = getDashboardStats();
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inbound', label: '📦 UA→PL' },
    { id: 'outbound', label: '🚚 PL→Client' },
    { id: 'stock', label: '🗃️ Stock' },
    { id: 'movements', label: '📋 Log' },
    { id: 'products', label: '⚙️ Products' },
    { id: 'clients', label: '👥 Clients' }
  ];

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: COLORS.bg, minHeight: '100vh', width: '100vw', height: '100vh', color: COLORS.text, margin: 0, padding: 0, overflow: 'hidden' }}>
      <header style={{ backgroundColor: COLORS.header, color: COLORS.text, padding: '20px', textAlign: 'center', borderBottom: `1px solid ${COLORS.border}` }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>Irina MISSO Warehouse</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.7 }}>Система управління складом</p>
      </header>

      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.header }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? COLORS.accent : COLORS.header,
              color: activeTab === tab.id ? COLORS.header : COLORS.text,
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '13px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {loading && <p style={{ textAlign: 'center', color: COLORS.accent }}>Завантаження...</p>}

        {!loading && activeTab === 'dashboard' && (
          <div>
            <h2 style={{ color: COLORS.accent }}>Огляд</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <StatCard title="Надходжень з України" value={stats.totalInbound} color={COLORS.inbound} />
              <StatCard title="Вивезено клієнтам" value={stats.totalOutbound} color={COLORS.outbound} />
              <StatCard title="Поточні запаси" value={stats.totalStock} color={COLORS.accent} />
              <StatCard title="Критичні" value={stats.criticalItems} color={stats.criticalItems > 0 ? COLORS.outbound : COLORS.inbound} />
            </div>

            <h3 style={{ color: COLORS.accent }}>Потік: Україна → Склад → Клієнти</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <FlowBox title="Україна" value={stats.totalInbound} color="#ff9800" />
              <FlowBox title="Склад ПЛ" value={stats.totalStock} color={COLORS.accent} />
              <FlowBox title="Клієнти" value={stats.totalOutbound} color={COLORS.inbound} />
            </div>
          </div>
        )}

        {!loading && activeTab === 'inbound' && <InboundTab inbound={inbound} products={MISSO_PRODUCTS} onAdd={addInbound} />}
        {!loading && activeTab === 'outbound' && <OutboundTab outbound={outbound} products={MISSO_PRODUCTS} clients={clients} onAdd={addOutbound} />}
        {!loading && activeTab === 'stock' && <StockTab stock={stock} products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'movements' && <MovementsTab movements={movements} products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'products' && <ProductsTab products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'clients' && <ClientsTab clients={clients} onReload={loadAllData} />}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: '20px', borderRadius: '6px', textAlign: 'center', borderLeft: `4px solid ${color}` }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', opacity: 0.7 }}>{title}</p>
      <h3 style={{ margin: 0, fontSize: '32px', color: color }}>{value}</h3>
    </div>
  );
}

function FlowBox({ title, value, color }) {
  return (
    <div style={{ backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: '25px', borderRadius: '6px', textAlign: 'center' }}>
      <h3 style={{ margin: 0, color: COLORS.accent }}>{title}</h3>
      <p style={{ margin: '15px 0 0 0', fontSize: '28px', fontWeight: 'bold', color: color }}>{value} од.</p>
    </div>
  );
}

function InboundTab({ inbound, products, onAdd }) {
  const [sku, setSku] = useState('FITBAR-MC-30');
  const [quantity, setQuantity] = useState(100);

  const handleAdd = async () => {
    if (quantity > 0) {
      await onAdd({
        product_sku: sku,
        quantity: parseInt(quantity),
        origin: 'Україна',
        status: 'received'
      });
      setQuantity(100);
    }
  };

  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>📦 Надходження з України</h2>
      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', marginBottom: '20px', border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Продукт:</label>
            <select value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
              {Object.entries(products).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Кількість:</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAdd} style={{ width: '100%', padding: '8px', backgroundColor: COLORS.inbound, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Додати
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ color: COLORS.accent }}>Історія</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}` }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Дата</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Продукт</th>
            <th style={{ padding: '10px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {inbound.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає даних</td></tr>
          ) : (
            inbound.slice(0, 20).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '10px', color: COLORS.text }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                <td style={{ padding: '10px', color: COLORS.text }}>{item.product_sku}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: COLORS.text }}>{item.quantity}</td>
                <td style={{ padding: '10px', color: COLORS.inbound }}>✓ Отримано</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OutboundTab({ outbound, products, clients, onAdd }) {
  const [sku, setSku] = useState('FITBAR-MC-30');
  const [quantity, setQuantity] = useState(50);
  const [client, setClient] = useState(clients.length > 0 ? clients[0].name : '');

  const handleAdd = async () => {
    if (quantity > 0 && client) {
      await onAdd({
        product_sku: sku,
        quantity: parseInt(quantity),
        client,
        destination: 'Польща',
        status: 'shipped'
      });
      setQuantity(50);
    }
  };

  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>🚚 Відправлення клієнтам</h2>
      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', marginBottom: '20px', border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Продукт:</label>
            <select value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
              {Object.entries(products).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>К-сть:</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Клієнт:</label>
            <select value={client} onChange={(e) => setClient(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
              {clients.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAdd} style={{ width: '100%', padding: '8px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Відправити
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ color: COLORS.accent }}>Історія</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}` }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Дата</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Продукт</th>
            <th style={{ padding: '10px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Клієнт</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {outbound.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає даних</td></tr>
          ) : (
            outbound.slice(0, 20).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '10px', color: COLORS.text }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                <td style={{ padding: '10px', color: COLORS.text }}>{item.product_sku}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: COLORS.text }}>{item.quantity}</td>
                <td style={{ padding: '10px', color: COLORS.text }}>{item.client}</td>
                <td style={{ padding: '10px', color: COLORS.outbound }}>✓ Відправлено</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StockTab({ stock, products }) {
  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>🗃️ Запаси</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}` }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>SKU</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Продукт</th>
            <th style={{ padding: '10px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '10px', textAlign: 'center', color: COLORS.accent }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {stock.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Склад порожній</td></tr>
          ) : (
            stock.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '10px', fontFamily: 'monospace', color: COLORS.accent }}>{item.product_sku}</td>
                <td style={{ padding: '10px', color: COLORS.text }}>{products[item.product_sku]?.name || item.product_sku}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: COLORS.text }}>{item.quantity}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {item.quantity < 5 ? (
                    <span style={{ color: COLORS.outbound, fontWeight: 'bold' }}>🔴 КРИТИЧНИЙ</span>
                  ) : item.quantity < 20 ? (
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>🟡 LOW</span>
                  ) : (
                    <span style={{ color: COLORS.inbound }}>🟢 OK</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTab({ movements, products }) {
  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>📋 Журнал</h2>
      <div style={{ backgroundColor: COLORS.header, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
        {movements.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає записів</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Час</th>
                <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Тип</th>
                <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>SKU</th>
                <th style={{ padding: '10px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
                <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Примітка</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 50).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '10px', color: COLORS.text, fontSize: '12px' }}>{new Date(item.created_at).toLocaleString('uk-UA')}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: item.type === 'INBOUND' ? COLORS.inbound : COLORS.outbound,
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', color: COLORS.accent, fontSize: '12px' }}>{item.product_sku}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: COLORS.text }}>{item.quantity}</td>
                  <td style={{ padding: '10px', color: COLORS.text, fontSize: '12px' }}>{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProductsTab({ products }) {
  const categories = {};
  Object.values(products).forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>⚙️ Каталог MISSO</h2>
      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: '30px' }}>
          <h3 style={{ color: COLORS.accent, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>{cat}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
            {items.map(p => (
              <div key={p.sku} style={{ backgroundColor: COLORS.header, padding: '15px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.accent}` }}>
                <h4 style={{ margin: '0 0 10px 0', color: COLORS.accent }}>{p.name}</h4>
                <p style={{ margin: '5px 0', fontSize: '11px', color: COLORS.text, opacity: 0.7 }}>SKU: <code style={{ color: COLORS.accent }}>{p.sku}</code></p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientsTab({ clients, onReload }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [contact, setContact] = useState('');

  const handleAdd = async () => {
    if (name && city) {
      try {
        await supabase.from('clients').insert([{ name, city, contact }]);
        setName('');
        setCity('');
        setContact('');
        onReload();
      } catch (err) {
        console.error('Помилка:', err);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await supabase.from('clients').delete().eq('id', id);
      onReload();
    } catch (err) {
      console.error('Помилка:', err);
    }
  };

  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>👥 Управління клієнтами</h2>
      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', marginBottom: '20px', border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Назва:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Biedronka" style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Місто:</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Варшава" style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Контакт:</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email@example.com" style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAdd} style={{ width: '100%', padding: '8px', backgroundColor: COLORS.inbound, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Додати
            </button>
          </div>
        </div>
      </div>

      <h3 style={{ color: COLORS.accent }}>Список клієнтів</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}` }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Назва</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Місто</th>
            <th style={{ padding: '10px', textAlign: 'left', color: COLORS.accent }}>Контакт</th>
            <th style={{ padding: '10px', textAlign: 'center', color: COLORS.accent }}>Дія</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає клієнтів</td></tr>
          ) : (
            clients.map((client) => (
              <tr key={client.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '10px', color: COLORS.text }}>{client.name}</td>
                <td style={{ padding: '10px', color: COLORS.text }}>{client.city}</td>
                <td style={{ padding: '10px', color: COLORS.text, fontSize: '12px' }}>{client.contact || '—'}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button onClick={() => handleDelete(client.id)} style={{ padding: '4px 12px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    Видалити
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
