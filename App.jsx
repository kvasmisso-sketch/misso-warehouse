import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inbound, setInbound] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [stock, setStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const MISSO_PRODUCTS = {
    'FITBAR-30-1': { name: 'FITBAR 30g (1шт)', category: 'FITBAR' },
    'FITBAR-30-2': { name: 'FITBAR 30g (2шт)', category: 'FITBAR' },
    'FITBAR-30-3': { name: 'FITBAR 30g (3шт)', category: 'FITBAR' },
    'FITBAR-30-4': { name: 'FITBAR 30g (4шт)', category: 'FITBAR' },
    'FITBAR-30-5': { name: 'FITBAR 30g (5шт)', category: 'FITBAR' },
    'BITE-180-1': { name: 'Bite 180g (1шт)', category: 'Bite' },
    'BITE-180-2': { name: 'Bite 180g (2шт)', category: 'Bite' },
    'BITE-180-3': { name: 'Bite 180g (3шт)', category: 'Bite' },
    'BITE-45-1': { name: 'Bite 45g (1шт)', category: 'Bite' },
    'BITE-45-2': { name: 'Bite 45g (2шт)', category: 'Bite' },
    'BITE-45-3': { name: 'Bite 45g (3шт)', category: 'Bite' },
    'MANGO-1': { name: 'Mango (1шт)', category: 'Mango' },
    'MANGO-2': { name: 'Mango (2шт)', category: 'Mango' },
    'MANGO-3': { name: 'Mango (3шт)', category: 'Mango' }
  };

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
      const [inboundData, outboundData, stockData, movementData] = await Promise.all([
        supabase.from('inbound').select('*').order('created_at', { ascending: false }),
        supabase.from('outbound').select('*').order('created_at', { ascending: false }),
        supabase.from('stock').select('*'),
        supabase.from('movements').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (inboundData.data) setInbound(inboundData.data);
      if (outboundData.data) setOutbound(outboundData.data);
      if (stockData.data) setStock(stockData.data);
      if (movementData.data) setMovements(movementData.data);
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
      console.error('Помилка додавання inbound:', err);
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
      console.error('Помилка додавання outbound:', err);
    }
  }

  const stats = getDashboardStats();

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{ backgroundColor: '#d9534f', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>MISSO Warehouse Poland</h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>Автоматизована система управління складом</p>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: 'white' }}>
        {['dashboard', 'inbound', 'outbound', 'stock', 'movements', 'products'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#d9534f' : 'white',
              color: activeTab === tab ? 'white' : '#333',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading && <p style={{ textAlign: 'center', color: '#999' }}>Завантаження...</p>}

        {!loading && activeTab === 'dashboard' && (
          <div>
            <h2>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <StatCard title="Надходжень з України" value={stats.totalInbound} color="#5cb85c" />
              <StatCard title="Вивезено до клієнтів" value={stats.totalOutbound} color="#0275d8" />
              <StatCard title="Поточні запаси" value={stats.totalStock} color="#5bc0de" />
              <StatCard title="Критичні позиції" value={stats.criticalItems} color={stats.criticalItems > 0 ? '#d9534f' : '#5cb85c'} />
            </div>

            <h3 style={{ marginTop: '30px' }}>Потік матеріалів: Україна → Склад Польща → Клієнти</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center' }}>
              <FlowBox title="Україна" value={stats.totalInbound} color="#ffc107" />
              <FlowBox title="Склад Польща" value={stats.totalStock} color="#17a2b8" />
              <FlowBox title="Клієнти ЄС" value={stats.totalOutbound} color="#28a745" />
            </div>
          </div>
        )}

        {!loading && activeTab === 'inbound' && <InboundTab inbound={inbound} products={MISSO_PRODUCTS} onAdd={addInbound} />}
        {!loading && activeTab === 'outbound' && <OutboundTab outbound={outbound} products={MISSO_PRODUCTS} onAdd={addOutbound} />}
        {!loading && activeTab === 'stock' && <StockTab stock={stock} products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'movements' && <MovementsTab movements={movements} products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'products' && <ProductsTab products={MISSO_PRODUCTS} />}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ backgroundColor: color, color: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>{title}</p>
      <h3 style={{ margin: 0, fontSize: '36px' }}>{value}</h3>
    </div>
  );
}

function FlowBox({ title, value, color }) {
  return (
    <div style={{ backgroundColor: color, color: 'white', padding: '30px', borderRadius: '8px' }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: 'bold' }}>{value} од.</p>
    </div>
  );
}

function InboundTab({ inbound, products, onAdd }) {
  const [sku, setSku] = useState('FITBAR-30-1');
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
      <h2>Інбаунд: Україна → Польща</h2>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label>Продукт:</label>
            <select value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
              {Object.entries(products).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Кількість:</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAdd} style={{ width: '100%', padding: '8px', backgroundColor: '#5cb85c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Додати
            </button>
          </div>
        </div>
      </div>

      <h3>Історія надходжень</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Дата</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Продукт</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Кількість</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {inbound.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#999' }}>Немає даних</td></tr>
          ) : (
            inbound.slice(0, 20).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                <td style={{ padding: '10px' }}>{item.product_sku}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '10px' }}>✓ Отримано</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OutboundTab({ outbound, products, onAdd }) {
  const [sku, setSku] = useState('FITBAR-30-1');
  const [quantity, setQuantity] = useState(50);
  const [client, setClient] = useState('Biedronka');

  const CLIENTS = ['Biedronka', 'Lidl Poland', 'Kaufland Poland', 'Carrefour Poland', 'Żabka', 'Natura Poland', 'Rossmann Poland'];

  const handleAdd = async () => {
    if (quantity > 0) {
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
      <h2>Аутбаунд: Польща → Клієнти</h2>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label>Продукт:</label>
            <select value={sku} onChange={(e) => setSku(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
              {Object.entries(products).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Кількість:</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
          </div>
          <div>
            <label>Клієнт:</label>
            <select value={client} onChange={(e) => setClient(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
              {CLIENTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAdd} style={{ width: '100%', padding: '8px', backgroundColor: '#0275d8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Відправити
            </button>
          </div>
        </div>
      </div>

      <h3>Історія відправлень</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Дата</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Продукт</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Кількість</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Клієнт</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {outbound.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center', color: '#999' }}>Немає даних</td></tr>
          ) : (
            outbound.slice(0, 20).map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                <td style={{ padding: '10px' }}>{item.product_sku}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '10px' }}>{item.client}</td>
                <td style={{ padding: '10px' }}>✓ Відправлено</td>
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
      <h2>Поточні запаси на складі</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>SKU</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Продукт</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Кількість</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {stock.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: '#999' }}>Складський облік порожній</td></tr>
          ) : (
            stock.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{item.product_sku}</td>
                <td style={{ padding: '10px' }}>{products[item.product_sku]?.name || item.product_sku}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {item.quantity < 5 ? (
                    <span style={{ color: '#d9534f', fontWeight: 'bold' }}>🔴 КРИТИЧНИЙ</span>
                  ) : item.quantity < 20 ? (
                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>🟡 LOW</span>
                  ) : (
                    <span style={{ color: '#5cb85c' }}>🟢 OK</span>
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
      <h2>Журнал руху матеріалів</h2>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        {movements.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Немає записів</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Час</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Тип</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>SKU</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Кількість</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Примітка</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 50).map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{new Date(item.created_at).toLocaleString('uk-UA')}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: item.type === 'INBOUND' ? '#d4edda' : '#cfe2ff',
                      color: item.type === 'INBOUND' ? '#155724' : '#084298'
                    }}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontFamily: 'monospace' }}>{item.product_sku}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '10px' }}>{item.notes}</td>
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
  return (
    <div>
      <h2>Каталог продуктів MISSO</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
        {Object.entries(products).map(([sku, info]) => (
          <div key={sku} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #d9534f' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>{info.name}</h4>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>SKU: <code>{sku}</code></p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>Категорія: <strong>{info.category}</strong></p>
          </div>
        ))}
      </div>
    </div>
  );
}
