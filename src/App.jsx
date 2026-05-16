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

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function LoginPage({ onLogin, onFirstLogin }) {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    loadAllowedUsers();
  }, []);

  async function loadAllowedUsers() {
    try {
      const { data } = await supabase.from('allowed_users').select('name').order('name', { ascending: true });
      if (data) setAllowedUsers(data);
    } catch (err) {
      console.error('Помилка завантаження користувачів:', err);
    }
    setLoading(false);
  }

  async function handleLogin() {
    if (!userName || !password) {
      setError('Введіть ім\'я та пароль!');
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, password_hash, is_admin')
        .eq('name', userName)
        .single();

      if (!userData) {
        setError('Користувача не знайдено!');
        return;
      }

      const passwordHash = await hashPassword(password);
      if (userData.password_hash !== passwordHash) {
        setError('Неправильний пароль!');
        return;
      }

      setError('');
      onLogin(userData.name, userData.is_admin);
      localStorage.setItem('currentUser', userData.name);
      localStorage.setItem('isAdmin', userData.is_admin);
    } catch (err) {
      setError('Помилка при вході!');
      console.error('Login error:', err);
    }
  }

  async function handleFirstLogin() {
    if (!userName) {
      setError('Виберіть ім\'я!');
      return;
    }

    if (password.length < 4) {
      setError('Пароль має бути щонайменше 4 символи!');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролі не збігаються!');
      return;
    }

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('name', userName)
        .single();

      if (existingUser) {
        setError('Користувач з цим ім\'ям вже існує!');
        return;
      }

      const passwordHash = await hashPassword(password);
      const { error: insertError } = await supabase.from('users').insert([{
        name: userName,
        password_hash: passwordHash,
        is_admin: false
      }]);

      if (insertError) {
        setError('Помилка при реєстрації!');
        return;
      }

      setError('');
      onFirstLogin(userName);
      localStorage.setItem('currentUser', userName);
      localStorage.setItem('isAdmin', false);
    } catch (err) {
      setError('Помилка при реєстрації!');
      console.error('First login error:', err);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: COLORS.bg, 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <p style={{ color: COLORS.accent }}>Завантаження...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: COLORS.bg, 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <div style={{
        backgroundColor: COLORS.header,
        padding: '40px',
        borderRadius: '8px',
        border: `1px solid ${COLORS.border}`,
        width: '350px'
      }}>
        <h1 style={{ color: COLORS.accent, textAlign: 'center', marginTop: 0, fontSize: '24px' }}>Irina MISSO</h1>
        <p style={{ color: COLORS.text, textAlign: 'center', fontSize: '12px', opacity: 0.7, marginBottom: '30px' }}>Система управління складом</p>

        {!isNewUser ? (
          <>
            <label style={{ color: COLORS.text, display: 'block', marginBottom: '10px', fontSize: '14px' }}>Ім'я користувача:</label>
            <select 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Виберіть ім'я</option>
              {allowedUsers.map(user => (
                <option key={user.name} value={user.name}>{user.name}</option>
              ))}
            </select>

            <label style={{ color: COLORS.text, display: 'block', marginBottom: '10px', fontSize: '14px' }}>Пароль:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введіть пароль"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />

            {error && <p style={{ color: COLORS.outbound, fontSize: '12px', marginBottom: '15px' }}>{error}</p>}

            <button 
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: COLORS.inbound,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}
            >
              Увійти
            </button>

            <button 
              onClick={() => {
                setIsNewUser(true);
                setUserName('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: COLORS.accent,
                color: COLORS.header,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Перший раз? Створіть пароль
            </button>
          </>
        ) : (
          <>
            <label style={{ color: COLORS.text, display: 'block', marginBottom: '10px', fontSize: '14px' }}>Виберіть ім'я:</label>
            <select 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Виберіть ім'я</option>
              {allowedUsers.map(user => (
                <option key={user.name} value={user.name}>{user.name}</option>
              ))}
            </select>

            <label style={{ color: COLORS.text, display: 'block', marginBottom: '10px', fontSize: '14px' }}>Придумайте пароль:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Мінімум 4 символи"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />

            <label style={{ color: COLORS.text, display: 'block', marginBottom: '10px', fontSize: '14px' }}>Повторіть пароль:</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторіть пароль"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                backgroundColor: COLORS.bg,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleFirstLogin()}
            />

            {error && <p style={{ color: COLORS.outbound, fontSize: '12px', marginBottom: '15px' }}>{error}</p>}

            <button 
              onClick={handleFirstLogin}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: COLORS.inbound,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}
            >
              Створити аккаунт
            </button>

            <button 
              onClick={() => {
                setIsNewUser(false);
                setUserName('');
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: COLORS.border,
                color: COLORS.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Повернутись до входу
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inbound, setInbound] = useState([]);
  const [outbound, setOutbound] = useState([]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedAdmin = localStorage.getItem('isAdmin') === 'true';
    if (savedUser) {
      setCurrentUser(savedUser);
      setIsAdmin(savedAdmin);
      loadAllData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
      const subscription = supabase
        .channel('all-tables')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          loadAllData();
        })
        .subscribe();
      return () => subscription.unsubscribe();
    }
  }, [currentUser]);

  async function loadAllData() {
    setLoading(true);
    try {
      const [inboundData, outboundData, stockData, movementData, auditData, clientsData, usersData, allowedUsersData] = await Promise.all([
        supabase.from('inbound').select('*').order('created_at', { ascending: false }),
        supabase.from('outbound').select('*').order('created_at', { ascending: false }),
        supabase.from('stock').select('*'),
        supabase.from('movements').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('clients').select('*').order('name', { ascending: true }),
        supabase.from('users').select('id, name, is_admin, created_at'),
        supabase.from('allowed_users').select('*').order('name', { ascending: true })
      ]);

      if (inboundData.data) setInbound(inboundData.data);
      if (outboundData.data) setOutbound(outboundData.data);
      if (stockData.data) setStock(stockData.data);
      if (movementData.data) setMovements(movementData.data);
      if (auditData.data) setAuditLog(auditData.data);
      if (clientsData.data) setClients(clientsData.data);
      if (usersData.data) setUsers(usersData.data);
      if (allowedUsersData.data) setAllowedUsers(allowedUsersData.data);
    } catch (err) {
      console.error('Помилка завантаження:', err);
    }
    setLoading(false);
  }

  async function logAudit(action, tableName, details, oldValue = null, newValue = null) {
    try {
      await supabase.from('audit_log').insert([{
        user_name: currentUser,
        action,
        table_name: tableName,
        details,
        old_value: oldValue,
        new_value: newValue
      }]);
    } catch (err) {
      console.error('Помилка логування:', err);
    }
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
      
      const existingStock = stock.find(s => s.product_sku === formData.product_sku);
      
      if (existingStock) {
        await supabase
          .from('stock')
          .update({ quantity: existingStock.quantity + formData.quantity })
          .eq('product_sku', formData.product_sku);
      } else {
        await supabase.from('stock').insert([{
          product_sku: formData.product_sku,
          quantity: formData.quantity
        }]);
      }

      await supabase.from('movements').insert([{
        type: 'INBOUND',
        product_sku: formData.product_sku,
        quantity: formData.quantity,
        notes: `Надійшло з України: ${formData.quantity} од.`
      }]);

      await logAudit('ДОДАВ', 'inbound', `Додав ${formData.quantity} од. ${formData.product_sku}`, null, formData.quantity);
      
      loadAllData();
      alert('✅ Товар успішно додано!');
    } catch (err) {
      console.error('Помилка:', err);
      alert('❌ Помилка при додаванні!');
    }
  }

  async function addOutbound(formData) {
    try {
      const currentStock = stock.find(s => s.product_sku === formData.product_sku);
      
      if (!currentStock || currentStock.quantity < formData.quantity) {
        alert(`❌ Недостатньо товару! На складі: ${currentStock?.quantity || 0} од., а ви хочете відправити: ${formData.quantity} од.`);
        return;
      }

      await supabase.from('outbound').insert([formData]);

      await supabase
        .from('stock')
        .update({ quantity: currentStock.quantity - formData.quantity })
        .eq('product_sku', formData.product_sku);

      await supabase.from('movements').insert([{
        type: 'OUTBOUND',
        product_sku: formData.product_sku,
        quantity: formData.quantity,
        notes: `Вивезено до ${formData.client}: ${formData.quantity} од.`
      }]);

      await logAudit('ВІДПРАВИВ', 'outbound', `Відправив ${formData.quantity} од. до ${formData.client}`, currentStock.quantity, currentStock.quantity - formData.quantity);
      
      loadAllData();
      alert('✅ Товар успішно відправлено!');
    } catch (err) {
      console.error('Помилка:', err);
      alert('❌ Помилка при відправленні!');
    }
  }

  async function editOperation(id, tableName, oldData, newData) {
    if (!currentUser || (currentUser !== (oldData.user_name || currentUser) && !isAdmin)) {
      alert('❌ Ви можете редагувати тільки свої операції!');
      return;
    }

    try {
      await supabase.from(tableName).update(newData).eq('id', id);
      
      const diffFields = Object.keys(newData).filter(key => oldData[key] !== newData[key]);
      const details = diffFields.map(f => `${f}: ${oldData[f]} → ${newData[f]}`).join(', ');
      
      await logAudit('РЕДАГУВАВ', tableName, details, JSON.stringify(oldData), JSON.stringify(newData));
      
      setEditingId(null);
      loadAllData();
      alert('✅ Запис успішно оновлено!');
    } catch (err) {
      console.error('Помилка:', err);
      alert('❌ Помилка при редагуванні!');
    }
  }

  async function deleteOperation(id, tableName, data) {
    if (!currentUser || (currentUser !== (data.user_name || currentUser) && !isAdmin)) {
      alert('❌ Ви можете видаляти тільки свої операції!');
      return;
    }

    if (!confirm('⚠️ Ви впевнені що хочете видалити цю операцію? Дія неповоротна!')) {
      return;
    }

    try {
      await supabase.from(tableName).delete().eq('id', id);
      
      await logAudit('ВИДАЛИВ', tableName, `Видалив запис: ${JSON.stringify(data)}`, JSON.stringify(data), null);
      
      loadAllData();
      alert('✅ Запис успішно видалено!');
    } catch (err) {
      console.error('Помилка:', err);
      alert('❌ Помилка при видаленні!');
    }
  }

  if (!currentUser) {
    return <LoginPage onLogin={(user, admin) => {
      setCurrentUser(user);
      setIsAdmin(admin);
    }} onFirstLogin={(user) => {
      setCurrentUser(user);
      setIsAdmin(false);
    }} />;
  }

  const stats = getDashboardStats();
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inbound', label: '📦 UA→PL' },
    { id: 'outbound', label: '🚚 PL→Client' },
    { id: 'stock', label: '🗃️ Stock' },
    { id: 'movements', label: '📋 Log' },
    { id: 'audit', label: '📝 Журнал' },
    { id: 'products', label: '⚙️ Продукти' },
    { id: 'clients', label: '👥 Клієнти' }
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: '🔐 Адмін' });
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: COLORS.bg, minHeight: '100vh', color: COLORS.text, margin: 0, padding: 0 }}>
      <header style={{ backgroundColor: COLORS.header, color: COLORS.text, padding: '20px', textAlign: 'center', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Irina MISSO Warehouse</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.7 }}>Система управління складом</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: COLORS.accent }}>Користувач: <strong>{currentUser}</strong> {isAdmin && '👑'}</p>
          <button onClick={() => {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAdmin');
            setCurrentUser(null);
          }} style={{ padding: '6px 12px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            Вихід
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.header, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '1',
              padding: '14px 10px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? COLORS.accent : COLORS.header,
              color: activeTab === tab.id ? COLORS.header : COLORS.text,
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '12px',
              whiteSpace: 'nowrap'
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

        {!loading && activeTab === 'inbound' && <InboundTab inbound={inbound} products={MISSO_PRODUCTS} onAdd={addInbound} currentUser={currentUser} isAdmin={isAdmin} onEdit={editOperation} onDelete={deleteOperation} editingId={editingId} setEditingId={setEditingId} editValues={editValues} setEditValues={setEditValues} />}
        {!loading && activeTab === 'outbound' && <OutboundTab outbound={outbound} products={MISSO_PRODUCTS} clients={clients} stock={stock} onAdd={addOutbound} currentUser={currentUser} isAdmin={isAdmin} onEdit={editOperation} onDelete={deleteOperation} editingId={editingId} setEditingId={setEditingId} editValues={editValues} setEditValues={setEditValues} />}
        {!loading && activeTab === 'stock' && <StockTab stock={stock} products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'movements' && <MovementsTab movements={movements} products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'audit' && <AuditTab auditLog={auditLog} />}
        {!loading && activeTab === 'products' && <ProductsTab products={MISSO_PRODUCTS} />}
        {!loading && activeTab === 'clients' && <ClientsTab clients={clients} currentUser={currentUser} isAdmin={isAdmin} onAddClient={async (clientData) => {
          try {
            await supabase.from('clients').insert([clientData]);
            await logAudit('ДОДАВ_КЛІЄНТА', 'clients', `Додав клієнта: ${clientData.name}`, null, JSON.stringify(clientData));
            loadAllData();
            alert('✅ Клієнта успішно додано!');
          } catch (err) {
            console.error('Помилка:', err);
            alert('❌ Помилка при додаванні клієнта!');
          }
        }} onDeleteClient={async (clientId, clientName) => {
          if (!isAdmin) {
            alert('❌ Тільки адміністратор може видаляти клієнтів!');
            return;
          }
          if (!confirm(`⚠️ Видалити клієнта ${clientName}?`)) return;
          try {
            await supabase.from('clients').delete().eq('id', clientId);
            await logAudit('ВИДАЛИВ_КЛІЄНТА', 'clients', `Видалив клієнта: ${clientName}`, null, null);
            loadAllData();
            alert('✅ Клієнта успішно видалено!');
          } catch (err) {
            console.error('Помилка:', err);
            alert('❌ Помилка при видаленні клієнта!');
          }
        }} />}
        {!loading && activeTab === 'admin' && isAdmin && <AdminPanel users={users} allowedUsers={allowedUsers} onAddAllowedUser={async (newName) => {
          try {
            await supabase.from('allowed_users').insert([{ name: newName, created_by: currentUser }]);
            await logAudit('ДОДАВ_КОРИСТУВАЧА', 'allowed_users', `Додав користувача: ${newName}`, null, newName);
            loadAllData();
            alert('✅ Користувача успішно додано!');
          } catch (err) {
            console.error('Помилка:', err);
            alert('❌ Помилка при додаванні користувача!');
          }
        }} onDeleteUser={async (userId, userName) => {
          if (!confirm(`⚠️ Видалити користувача ${userName}?\n\nУсі його операції залишаться в журналі.`)) return;
          try {
            await supabase.from('users').delete().eq('id', userId);
            await logAudit('ВИДАЛИВ_КОРИСТУВАЧА', 'users', `Видалив користувача: ${userName}`, null, null);
            loadAllData();
            alert('✅ Користувача успішно видалено!');
          } catch (err) {
            console.error('Помилка:', err);
            alert('❌ Помилка при видаленні користувача!');
          }
        }} />}
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

function InboundTab({ inbound, products, onAdd, currentUser, isAdmin, onEdit, onDelete, editingId, setEditingId, editValues, setEditValues }) {
  const [sku, setSku] = useState('FITBAR-MC-30');
  const [quantity, setQuantity] = useState(100);

  const handleAdd = async () => {
    if (quantity <= 0) {
      alert('Кількість має бути більше 0!');
      return;
    }
    await onAdd({
      product_sku: sku,
      quantity: parseInt(quantity),
      origin: 'Україна',
      status: 'received',
      user_name: currentUser
    });
    setQuantity(100);
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
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Дата</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Користувач</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Продукт</th>
            <th style={{ padding: '8px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Дія</th>
          </tr>
        </thead>
        <tbody>
          {inbound.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає даних</td></tr>
          ) : (
            inbound.slice(0, 20).map((item) => (
              editingId === item.id ? (
                <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}>
                  <td style={{ padding: '8px', color: COLORS.text }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.user_name}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.product_sku}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input type="number" value={editValues.quantity || item.quantity} onChange={(e) => setEditValues({...editValues, quantity: parseInt(e.target.value)})} style={{ width: '60px', padding: '4px', backgroundColor: COLORS.header, color: COLORS.text, border: `1px solid ${COLORS.border}` }} />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => onEdit(item.id, 'inbound', item, editValues)} style={{ padding: '3px 6px', backgroundColor: COLORS.inbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', marginRight: '4px' }}>✓</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '3px 6px', backgroundColor: COLORS.border, color: COLORS.text, border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '8px', color: COLORS.text }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.user_name}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.product_sku}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: COLORS.text }}>{item.quantity}</td>
                  <td style={{ padding: '8px' }}>
                    {(currentUser === item.user_name || isAdmin) && (
                      <>
                        <button onClick={() => { setEditingId(item.id); setEditValues({quantity: item.quantity}); }} style={{ padding: '3px 6px', backgroundColor: COLORS.accent, color: COLORS.header, border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', marginRight: '4px' }}>Ред</button>
                        <button onClick={() => onDelete(item.id, 'inbound', item)} style={{ padding: '3px 6px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>Вид</button>
                      </>
                    )}
                  </td>
                </tr>
              )
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OutboundTab({ outbound, products, clients, stock, onAdd, currentUser, isAdmin, onEdit, onDelete, editingId, setEditingId, editValues, setEditValues }) {
  const [sku, setSku] = useState('FITBAR-MC-30');
  const [quantity, setQuantity] = useState(50);
  const [client, setClient] = useState(clients.length > 0 ? clients[0].name : '');

  const currentStock = stock.find(s => s.product_sku === sku);
  const availableQty = currentStock?.quantity || 0;

  const handleAdd = async () => {
    if (quantity <= 0) {
      alert('Кількість має бути більше 0!');
      return;
    }
    if (!client) {
      alert('Виберіть клієнта!');
      return;
    }
    await onAdd({
      product_sku: sku,
      quantity: parseInt(quantity),
      client,
      destination: 'Польща',
      status: 'shipped',
      user_name: currentUser
    });
    setQuantity(50);
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
            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: availableQty < 20 ? COLORS.outbound : COLORS.inbound }}>
              На складі: {availableQty} од.
            </p>
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>К-сть:</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Клієнт:</label>
            <select value={client} onChange={(e) => setClient(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }}>
              {clients.length === 0 ? (
                <option>Немає клієнтів</option>
              ) : (
                clients.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))
              )}
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
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Дата</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Користувач</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Продукт</th>
            <th style={{ padding: '8px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Клієнт</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Дія</th>
          </tr>
        </thead>
        <tbody>
          {outbound.length === 0 ? (
            <tr><td colSpan="6" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає даних</td></tr>
          ) : (
            outbound.slice(0, 20).map((item) => (
              editingId === item.id ? (
                <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}>
                  <td style={{ padding: '8px', color: COLORS.text }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.user_name}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.product_sku}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input type="number" value={editValues.quantity || item.quantity} onChange={(e) => setEditValues({...editValues, quantity: parseInt(e.target.value)})} style={{ width: '60px', padding: '4px', backgroundColor: COLORS.header, color: COLORS.text, border: `1px solid ${COLORS.border}` }} />
                  </td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.client}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => onEdit(item.id, 'outbound', item, editValues)} style={{ padding: '3px 6px', backgroundColor: COLORS.inbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', marginRight: '4px' }}>✓</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '3px 6px', backgroundColor: COLORS.border, color: COLORS.text, border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '8px', color: COLORS.text }}>{new Date(item.created_at).toLocaleDateString('uk-UA')}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.user_name}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.product_sku}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: COLORS.text }}>{item.quantity}</td>
                  <td style={{ padding: '8px', color: COLORS.text }}>{item.client}</td>
                  <td style={{ padding: '8px' }}>
                    {(currentUser === item.user_name || isAdmin) && (
                      <>
                        <button onClick={() => { setEditingId(item.id); setEditValues({quantity: item.quantity}); }} style={{ padding: '3px 6px', backgroundColor: COLORS.accent, color: COLORS.header, border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', marginRight: '4px' }}>Ред</button>
                        <button onClick={() => onDelete(item.id, 'outbound', item)} style={{ padding: '3px 6px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>Вид</button>
                      </>
                    )}
                  </td>
                </tr>
              )
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
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>SKU</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Продукт</th>
            <th style={{ padding: '8px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '8px', textAlign: 'center', color: COLORS.accent }}>Статус</th>
          </tr>
        </thead>
        <tbody>
          {stock.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Склад порожній</td></tr>
          ) : (
            stock.map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '8px', fontFamily: 'monospace', color: COLORS.accent }}>{item.product_sku}</td>
                <td style={{ padding: '8px', color: COLORS.text }}>{products[item.product_sku]?.name || item.product_sku}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: COLORS.text }}>{item.quantity}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {item.quantity < 5 ? (
                    <span style={{ color: COLORS.outbound, fontWeight: 'bold' }}>🔴 КРИТИЧНИЙ</span>
                  ) : item.quantity < 20 ? (
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>🟡 НИЗЬКИЙ</span>
                  ) : (
                    <span style={{ color: COLORS.inbound }}>🟢 ОК</span>
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
      <h2 style={{ color: COLORS.accent }}>📋 Журнал операцій</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Час</th>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Тип</th>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>SKU</th>
            <th style={{ padding: '6px', textAlign: 'center', color: COLORS.accent }}>К-сть</th>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Примітка</th>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає записів</td></tr>
          ) : (
            movements.slice(0, 50).map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '6px', color: COLORS.text }}>{new Date(item.created_at).toLocaleString('uk-UA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '6px' }}>
                  <span style={{ 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    backgroundColor: item.type === 'INBOUND' ? COLORS.inbound : COLORS.outbound,
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {item.type === 'INBOUND' ? 'В' : 'З'}
                  </span>
                </td>
                <td style={{ padding: '6px', fontFamily: 'monospace', color: COLORS.accent, fontSize: '10px' }}>{item.product_sku}</td>
                <td style={{ padding: '6px', textAlign: 'center', color: COLORS.text }}>{item.quantity}</td>
                <td style={{ padding: '6px', color: COLORS.text }}>{item.notes}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ auditLog }) {
  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>📝 Журнал аудиту</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Час</th>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Користувач</th>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Дія</th>
            <th style={{ padding: '6px', textAlign: 'left', color: COLORS.accent }}>Деталі</th>
          </tr>
        </thead>
        <tbody>
          {auditLog.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає записів</td></tr>
          ) : (
            auditLog.slice(0, 100).map((item) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '6px', color: COLORS.text }}>{new Date(item.created_at).toLocaleString('uk-UA', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '6px', color: COLORS.accent, fontWeight: 'bold', fontSize: '10px' }}>{item.user_name}</td>
                <td style={{ padding: '6px', color: COLORS.outbound, fontSize: '10px' }}>{item.action}</td>
                <td style={{ padding: '6px', color: COLORS.text, fontSize: '10px' }}>{item.details}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
                <h4 style={{ margin: '0 0 10px 0', color: COLORS.accent, fontSize: '13px' }}>{p.name}</h4>
                <p style={{ margin: '5px 0', fontSize: '11px', color: COLORS.text, opacity: 0.7 }}>SKU: <code style={{ color: COLORS.accent }}>{p.sku}</code></p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientsTab({ clients, currentUser, isAdmin, onAddClient, onDeleteClient }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [contact, setContact] = useState('');

  const handleAdd = async () => {
    if (name && city) {
      await onAddClient({ name, city, contact });
      setName('');
      setCity('');
      setContact('');
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
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: COLORS.header, border: `1px solid ${COLORS.border}`, fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Назва</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Місто</th>
            <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Контакт</th>
            <th style={{ padding: '8px', textAlign: 'center', color: COLORS.accent }}>Дія</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: '10px', textAlign: 'center', color: COLORS.text, opacity: 0.5 }}>Немає клієнтів</td></tr>
          ) : (
            clients.map((client) => (
              <tr key={client.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '8px', color: COLORS.text }}>{client.name}</td>
                <td style={{ padding: '8px', color: COLORS.text }}>{client.city}</td>
                <td style={{ padding: '8px', color: COLORS.text, fontSize: '11px' }}>{client.contact || '—'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {isAdmin && (
                    <button onClick={() => onDeleteClient(client.id, client.name)} style={{ padding: '4px 8px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                      Видалити
                    </button>
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

function AdminPanel({ users, allowedUsers, onAddAllowedUser, onDeleteUser }) {
  const [newUserName, setNewUserName] = useState('');

  const handleAddUser = async () => {
    if (!newUserName) {
      alert('Введіть ім\'я!');
      return;
    }

    const exists = allowedUsers.find(u => u.name === newUserName);
    if (exists) {
      alert('Це ім\'я вже існує!');
      return;
    }

    await onAddAllowedUser(newUserName);
    setNewUserName('');
  };

  return (
    <div>
      <h2 style={{ color: COLORS.accent }}>🔐 Адміністраторська панель</h2>
      
      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}>
        <h3 style={{ color: COLORS.accent }}>Додати нового користувача</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ color: COLORS.text, fontSize: '12px' }}>Ім'я:</label>
            <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Введіть ім'я" style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleAddUser} style={{ width: '100%', padding: '8px', backgroundColor: COLORS.inbound, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Додати користувача
            </button>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}>
        <h3 style={{ color: COLORS.accent }}>Допущені користувачі</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
              <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Ім'я</th>
              <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Статус реєстрації</th>
            </tr>
          </thead>
          <tbody>
            {allowedUsers.map(user => {
              const isRegistered = users.find(u => u.name === user.name);
              return (
                <tr key={user.name} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '8px', color: COLORS.text }}>{user.name}</td>
                  <td style={{ padding: '8px', color: isRegistered ? COLORS.inbound : COLORS.outbound }}>
                    {isRegistered ? '✅ Зареєстрований' : '⏳ Очікує реєстрації'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}>
        <h3 style={{ color: COLORS.accent }}>Активні користувачі</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
              <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Ім'я</th>
              <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Дата створення</th>
              <th style={{ padding: '8px', textAlign: 'left', color: COLORS.accent }}>Роль</th>
              <th style={{ padding: '8px', textAlign: 'center', color: COLORS.accent }}>Дія</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: '8px', color: COLORS.text }}>{user.name}</td>
                <td style={{ padding: '8px', color: COLORS.text, fontSize: '11px' }}>{new Date(user.created_at).toLocaleDateString('uk-UA')}</td>
                <td style={{ padding: '8px', color: user.is_admin ? COLORS.outbound : COLORS.text }}>
                  {user.is_admin ? '👑 АДМІН' : 'Користувач'}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {!user.is_admin && (
                    <button onClick={() => onDeleteUser(user.id, user.name)} style={{ padding: '3px 8px', backgroundColor: COLORS.outbound, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>
                      Видалити
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ backgroundColor: COLORS.header, padding: '20px', borderRadius: '6px', border: `1px solid ${COLORS.border}` }}>
        <h3 style={{ color: COLORS.accent }}>Інформація</h3>
        <p style={{ color: COLORS.text, fontSize: '12px', lineHeight: '1.6' }}>
          ✅ Додавай нових користувачів в список.<br/>
          ✅ Кожен вибирає своє ім'я при першому вході.<br/>
          ✅ Кожен створює свій унікальний пароль.<br/>
          ✅ Паролі не видні навіть тобі (адміну).<br/>
          ✅ Журнал аудиту зберігає всі дії - неможливо скрити або змінити.
        </p>
      </div>
    </div>
  );
}
