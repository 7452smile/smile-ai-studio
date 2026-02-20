import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Users, ShoppingCart, Activity, CreditCard, Key, Gift, Ticket,
  Search, ChevronLeft, ChevronRight, RefreshCw, Plus, Minus,
  CheckCircle, XCircle, Clock, AlertTriangle, Copy, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeneration } from '../context/GenerationContext';
import { adminQuery, adminAction, supabase } from '../services/api';

type AdminTab = 'overview' | 'users' | 'orders' | 'tasks' | 'subscriptions' | 'api_keys' | 'referrals' | 'redemption';

interface AdminOverviewData {
  total_users: number;
  today_users: number;
  total_revenue: number;
  today_revenue: number;
  active_subscriptions: number;
  tier_distribution: Record<string, number>;
  recent_tasks: AdminTask[];
}

interface AdminUser {
  id: string;
  phone: string;
  email: string | null;
  nickname: string;
  credits: number;
  subscription_tier: string | null;
  created_at: string;
}

interface AdminOrder {
  out_trade_no: string;
  user_phone: string;
  user_email: string | null;
  tier_id: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
}

interface AdminTask {
  id: string;
  user_phone: string;
  nickname?: string;
  model: string;
  task_type: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  credits_cost: number;
  created_at: string;
}

interface AdminSubscription {
  user_phone: string;
  nickname?: string;
  tier_id: string;
  billing_cycle: 'monthly' | 'annual';
  period_start: string | null;
  period_end: string | null;
  subscription_tiers?: { name: string };
}

interface AdminApiKey {
  id: string;
  api_key: string;
  remaining_credits: number | null;
  is_active: boolean;
  note: string | null;
}

// ============================================================
// 概览 Tab
// ============================================================
const OverviewTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'overview');
    if (res.success) setData(res.data);
    setLoading(false);
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64 text-content-tertiary">加载中...</div>;
  if (!data) return <div className="text-center text-error">加载失败</div>;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '总用户', value: data.total_users, color: 'text-blue-400' },
          { label: '今日新增', value: data.today_users, color: 'text-green-400' },
          { label: '总收入', value: `¥${data.total_revenue.toFixed(2)}`, color: 'text-amber-400' },
          { label: '今日收入', value: `¥${data.today_revenue.toFixed(2)}`, color: 'text-purple-400' },
        ].map(card => (
          <div key={card.label} className="card p-4">
            <div className="text-xs text-content-tertiary mb-1">{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>
      {/* 活跃订阅 + 套餐分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-medium text-content mb-3">活跃订阅: {data.active_subscriptions}</div>
          <div className="space-y-2">
            {Object.entries(data.tier_distribution as Record<string, number>).map(([name, count]) => (
              <div key={name} className="flex justify-between text-xs">
                <span className="text-content-secondary">{name}</span>
                <span className="text-content font-medium">{count as number}</span>
              </div>
            ))}
            {Object.keys(data.tier_distribution).length === 0 && (
              <div className="text-xs text-content-tertiary">暂无活跃订阅</div>
            )}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm font-medium text-content mb-3">最近活动</div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
            {(data.recent_tasks || []).map((t: AdminTask) => (
              <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-surface-border last:border-0">
                <span className="text-content-secondary truncate max-w-[120px]">{t.nickname || t.user_phone}</span>
                <span className="text-content-tertiary">{t.model}</span>
                <span className={t.status === 'completed' ? 'text-green-400' : t.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>
                  {t.status}
                </span>
                <span className="text-content-tertiary">{t.credits_cost || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 分页组件
// ============================================================
const Pagination: React.FC<{ page: number; total: number; pageSize: number; onChange: (p: number) => void }> = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between text-xs text-content-tertiary mt-4">
      <span>共 {total} 条</span>
      <div className="flex items-center space-x-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="p-1 hover:text-content disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
        <span>{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="p-1 hover:text-content disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

// ============================================================
// 用户管理 Tab
// ============================================================
const UsersTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [tierSelect, setTierSelect] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'users', { page, search, page_size: 20 });
    if (res.success) { setUsers(res.data || []); setTotal(res.total || 0); }
    setLoading(false);
  }, [phone, page, search]);

  useEffect(() => { load(); }, [load]);

  const handleAdjustCredits = async (userPhone: string) => {
    const amt = parseInt(creditAmount);
    if (isNaN(amt) || amt === 0) return;
    const res = await adminAction(phone, 'adjust_credits', { phone: userPhone, amount: amt });
    if (res.success) { setCreditAmount(''); setEditingUser(null); load(); }
    else alert(res.error || '操作失败');
  };

  const handleChangeTier = async (userPhone: string, tierId: string) => {
    const res = await adminAction(phone, 'change_tier', { phone: userPhone, tier_id: tierId });
    if (res.success) { setTierSelect(''); load(); }
    else alert(res.error || '操作失败');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent"
            placeholder="搜索昵称/邮箱/手机号..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button onClick={load} className="p-2 hover:bg-surface-hover rounded-lg text-content-tertiary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">昵称</th>
              <th className="text-left py-2 px-3">手机号/邮箱</th>
              <th className="text-right py-2 px-3">积分</th>
              <th className="text-left py-2 px-3">套餐</th>
              <th className="text-left py-2 px-3">注册时间</th>
              <th className="text-right py-2 px-3">操作</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id || u.phone} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="py-2 px-3 text-content">{u.nickname || '-'}</td>
                  <td className="py-2 px-3 text-content-secondary">
                    {u.phone && <span className="mr-1">{u.phone}</span>}
                    {u.email && <span className="mr-1">{u.email}</span>}
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${u.phone && !u.email ? 'bg-blue-500/20 text-blue-400' : !u.phone && u.email ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                      {u.phone && !u.email ? '手机' : !u.phone && u.email ? '邮箱/Google' : u.phone && u.email ? '多方式' : '-'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-content">{u.credits}</td>
                  <td className="py-2 px-3 text-content-secondary">{u.subscription_tier || 'free'}</td>
                  <td className="py-2 px-3 text-content-tertiary">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="py-2 px-3 text-right space-x-1">
                    {editingUser === (u.id || u.phone) ? (
                      <div className="inline-flex items-center space-x-1">
                        <input className="w-20 px-2 py-1 bg-surface border border-surface-border rounded text-xs text-content" placeholder="正=加/负=扣" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
                        <button onClick={() => handleAdjustCredits(u.id || u.phone)} className="text-green-400 hover:text-green-300"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setEditingUser(null)} className="text-red-400 hover:text-red-300"><XCircle className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setEditingUser(u.id || u.phone)} className="text-accent hover:text-accent/80 text-xs">调整积分</button>
                        <select className="bg-surface border border-surface-border rounded text-xs text-content py-1 px-1" value="" onChange={e => { if (e.target.value) handleChangeTier(u.id || u.phone, e.target.value); }}>
                          <option value="">修改套餐</option>
                          {['free','starter','advanced','flagship','studio'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
    </div>
  );
};

// ============================================================
// 订单管理 Tab
// ============================================================
const OrdersTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'orders', { page, status: statusFilter, search, page_size: 20 });
    if (res.success) { setOrders(res.data || []); setTotal(res.total || 0); }
    setLoading(false);
  }, [phone, page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (outTradeNo: string) => {
    if (!confirm('确认手动标记此订单为已支付？')) return;
    const res = await adminAction(phone, 'mark_order_paid', { out_trade_no: outTradeNo });
    if (res.success) load();
    else alert(res.error || '操作失败');
  };

  const statusTabs = [
    { value: '', label: '全部' },
    { value: 'pending', label: '待支付' },
    { value: 'paid', label: '已支付' },
    { value: 'failed', label: '失败' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="flex space-x-1">
          {statusTabs.map(tab => (
            <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${statusFilter === tab.value ? 'bg-accent text-white' : 'text-content-tertiary hover:text-content hover:bg-surface-hover'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent"
            placeholder="订单号/手机号/邮箱..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">订单号</th>
              <th className="text-left py-2 px-3">手机号/邮箱</th>
              <th className="text-left py-2 px-3">套餐</th>
              <th className="text-right py-2 px-3">金额</th>
              <th className="text-center py-2 px-3">状态</th>
              <th className="text-left py-2 px-3">时间</th>
              <th className="text-right py-2 px-3">操作</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.out_trade_no} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="py-2 px-3 text-content font-mono text-[11px]">{o.out_trade_no}</td>
                  <td className="py-2 px-3 text-content-secondary">
                    {o.user_phone && <div>{o.user_phone}</div>}
                    {o.user_email && <div className="text-content-tertiary text-[10px]">{o.user_email}</div>}
                    {!o.user_phone && !o.user_email && '-'}
                  </td>
                  <td className="py-2 px-3 text-content-secondary">{o.tier_id}</td>
                  <td className="py-2 px-3 text-right text-content">{o.currency === 'USD' ? '$' : '¥'}{Number(o.amount).toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      o.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      o.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '失败'}</span>
                  </td>
                  <td className="py-2 px-3 text-content-tertiary">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                  <td className="py-2 px-3 text-right">
                    {o.status === 'pending' && (
                      <button onClick={() => handleMarkPaid(o.out_trade_no)} className="text-accent hover:text-accent/80 text-xs">标记已付</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
    </div>
  );
};

// ============================================================
// 任务监控 Tab
// ============================================================
const TasksTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'tasks', { page, status: statusFilter, model: modelFilter, page_size: 20 });
    if (res.success) { setTasks(res.data || []); setTotal(res.total || 0); }
    setLoading(false);
  }, [phone, page, statusFilter, modelFilter]);

  useEffect(() => { load(); }, [load]);

  // Realtime 订阅
  useEffect(() => {
    const channel = supabase
      .channel('admin-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_tasks' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <select className="bg-surface-raised border border-surface-border rounded-lg text-xs text-content py-2 px-3" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="processing">processing</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
        </select>
        <select className="bg-surface-raised border border-surface-border rounded-lg text-xs text-content py-2 px-3" value={modelFilter} onChange={e => { setModelFilter(e.target.value); setPage(1); }}>
          <option value="">全部模型</option>
          {['seedream','minimax','wan','seedance','pixverse','ltx','runway','kling','magnific','remove-bg'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={load} className="p-2 hover:bg-surface-hover rounded-lg text-content-tertiary"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">用户</th>
              <th className="text-left py-2 px-3">模型</th>
              <th className="text-left py-2 px-3">类型</th>
              <th className="text-center py-2 px-3">状态</th>
              <th className="text-right py-2 px-3">积分</th>
              <th className="text-left py-2 px-3">时间</th>
            </tr></thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="py-2 px-3 text-content-secondary">{t.nickname || t.user_phone}</td>
                  <td className="py-2 px-3 text-content">{t.model}</td>
                  <td className="py-2 px-3 text-content-tertiary">{t.task_type || '-'}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      t.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      t.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      t.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{t.status}</span>
                  </td>
                  <td className="py-2 px-3 text-right text-content">{t.credits_cost || 0}</td>
                  <td className="py-2 px-3 text-content-tertiary">{new Date(t.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
    </div>
  );
};

// ============================================================
// 订阅管理 Tab
// ============================================================
const SubscriptionsTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'subscriptions', { page, page_size: 20 });
    if (res.success) { setSubs(res.data || []); setTotal(res.total || 0); }
    setLoading(false);
  }, [phone, page]);

  useEffect(() => { load(); }, [load]);

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-4">
      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">用户</th>
              <th className="text-left py-2 px-3">套餐</th>
              <th className="text-left py-2 px-3">周期</th>
              <th className="text-left py-2 px-3">开始时间</th>
              <th className="text-left py-2 px-3">到期时间</th>
            </tr></thead>
            <tbody>
              {subs.map((s, i) => {
                const expiring = s.period_end && new Date(s.period_end) <= sevenDaysFromNow;
                return (
                  <tr key={i} className={`border-b border-surface-border hover:bg-surface-hover ${expiring ? 'bg-amber-500/5' : ''}`}>
                    <td className="py-2 px-3 text-content">{s.nickname || s.user_phone}</td>
                    <td className="py-2 px-3 text-content-secondary">{s.subscription_tiers?.name || s.tier_id}</td>
                    <td className="py-2 px-3 text-content-tertiary">{s.billing_cycle === 'annual' ? '年付' : '月付'}</td>
                    <td className="py-2 px-3 text-content-tertiary">{s.period_start ? new Date(s.period_start).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className="py-2 px-3">
                      <span className={expiring ? 'text-amber-400 font-medium' : 'text-content-tertiary'}>
                        {s.period_end ? new Date(s.period_end).toLocaleDateString('zh-CN') : '-'}
                        {expiring && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
    </div>
  );
};

// ============================================================
// API密钥 Tab
// ============================================================
const ApiKeysTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [keys, setKeys] = useState<AdminApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'api_keys');
    if (res.success) setKeys(res.data || []);
    setLoading(false);
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (keyId: string, currentActive: boolean) => {
    const res = await adminAction(phone, 'toggle_api_key', { key_id: keyId, is_active: !currentActive });
    if (res.success) load();
    else alert(res.error || '操作失败');
  };

  return (
    <div className="space-y-4">
      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">API Key</th>
              <th className="text-right py-2 px-3">余额</th>
              <th className="text-center py-2 px-3">状态</th>
              <th className="text-left py-2 px-3">备注</th>
              <th className="text-right py-2 px-3">操作</th>
            </tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="py-2 px-3 text-content font-mono text-[11px]">{k.api_key}</td>
                  <td className="py-2 px-3 text-right text-content">{k.remaining_credits ?? '-'}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${k.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {k.is_active ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-content-tertiary">{k.note || '-'}</td>
                  <td className="py-2 px-3 text-right">
                    <button onClick={() => handleToggle(k.id, k.is_active)}
                      className={`text-xs ${k.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}>
                      {k.is_active ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 邀请返利 Tab
// ============================================================
interface AdminReferralReward {
  id: string;
  referrer_phone: string;
  referee_phone: string;
  reward_type: 'signup' | 'commission';
  credits_amount: number;
  order_out_trade_no: string | null;
  purchase_count: number | null;
  created_at: string;
}

interface ReferralStats {
  total_referral_codes: number;
  total_rewards: number;
  total_signup_credits: number;
  total_commission_credits: number;
}

const ReferralsTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [rewards, setRewards] = useState<AdminReferralReward[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'referrals', { page, search, page_size: 20 });
    if (res.success) {
      setRewards(res.data || []);
      setTotal(res.total || 0);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  }, [phone, page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '邀请码总数', value: stats.total_referral_codes, color: 'text-blue-400' },
            { label: '奖励记录', value: stats.total_rewards, color: 'text-green-400' },
            { label: '注册奖励积分', value: stats.total_signup_credits.toLocaleString(), color: 'text-amber-400' },
            { label: '佣金积分', value: stats.total_commission_credits.toLocaleString(), color: 'text-purple-400' },
          ].map(card => (
            <div key={card.label} className="card p-4">
              <div className="text-xs text-content-tertiary mb-1">{card.label}</div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 搜索 */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent"
            placeholder="搜索昵称/邮箱/手机号..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button onClick={load} className="p-2 hover:bg-surface-hover rounded-lg text-content-tertiary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* 表格 */}
      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">邀请人</th>
              <th className="text-left py-2 px-3">被邀请人</th>
              <th className="text-center py-2 px-3">类型</th>
              <th className="text-right py-2 px-3">积分</th>
              <th className="text-left py-2 px-3">关联订单</th>
              <th className="text-center py-2 px-3">购买次数</th>
              <th className="text-left py-2 px-3">时间</th>
            </tr></thead>
            <tbody>
              {rewards.map(r => (
                <tr key={r.id} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="py-2 px-3 text-content">{r.referrer_phone}</td>
                  <td className="py-2 px-3 text-content-secondary">{r.referee_phone}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      r.reward_type === 'signup' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>{r.reward_type === 'signup' ? '注册奖励' : '付费佣金'}</span>
                  </td>
                  <td className="py-2 px-3 text-right text-accent font-semibold">+{r.credits_amount}</td>
                  <td className="py-2 px-3 text-content-tertiary font-mono text-[11px]">{r.order_out_trade_no || '-'}</td>
                  <td className="py-2 px-3 text-center text-content-tertiary">{r.purchase_count ?? '-'}</td>
                  <td className="py-2 px-3 text-content-tertiary">{new Date(r.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
              {rewards.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-content-tertiary">暂无邀请记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
    </div>
  );
};

// ============================================================
// 兑换码管理 Tab
// ============================================================
interface AdminRedemptionCode {
  id: string;
  code: string;
  credits_amount: number;
  max_uses: number;
  current_uses: number;
  code_type: 'promo' | 'new_user' | 'subscription';
  is_active: boolean;
  expires_at: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  tier_id: string | null;
}

const TIER_NAMES: Record<string, string> = {
  starter: '入门版',
  advanced: '进阶版',
  flagship: '旗舰版',
  studio: '工作室版',
};

const PAID_TIERS = ['starter', 'advanced', 'flagship', 'studio'];

const RedemptionTab: React.FC<{ phone: string }> = ({ phone }) => {
  const [codes, setCodes] = useState<AdminRedemptionCode[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total_codes: number; total_redemptions: number } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<string[] | null>(null);
  const [createForm, setCreateForm] = useState({ code: '', credits_amount: 100, max_uses: 1, code_type: 'promo', description: '', expires_at: '', tier_id: '' });
  const [batchForm, setBatchForm] = useState({ count: 10, prefix: '', credits_amount: 100, max_uses: 1, code_type: 'promo', description: '', expires_at: '', tier_id: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminQuery(phone, 'redemption_codes', { page, search, page_size: 20 });
    if (res.success) {
      setCodes(res.data || []);
      setTotal(res.total || 0);
      if (res.stats) setStats(res.stats);
    }
    setLoading(false);
  }, [phone, page, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (createForm.code_type === 'subscription') {
      if (!createForm.tier_id) return alert('请选择套餐');
    } else {
      if (!createForm.credits_amount || createForm.credits_amount <= 0) return alert('积分数必须大于0');
    }
    setActionLoading(true);
    const res = await adminAction(phone, 'create_redemption_code', {
      code: createForm.code || undefined,
      credits_amount: createForm.code_type === 'subscription' ? 0 : createForm.credits_amount,
      max_uses: createForm.max_uses,
      code_type: createForm.code_type,
      description: createForm.description || undefined,
      expires_at: createForm.expires_at || undefined,
      tier_id: createForm.code_type === 'subscription' ? createForm.tier_id : undefined,
    });
    setActionLoading(false);
    if (res.success) {
      setShowCreate(false);
      setCreateForm({ code: '', credits_amount: 100, max_uses: 1, code_type: 'promo', description: '', expires_at: '', tier_id: '' });
      load();
    } else {
      alert(res.error || '创建失败');
    }
  };

  const handleBatchCreate = async () => {
    if (!batchForm.count || batchForm.count <= 0) return alert('数量必须大于0');
    if (batchForm.code_type === 'subscription') {
      if (!batchForm.tier_id) return alert('请选择套餐');
    } else {
      if (!batchForm.credits_amount || batchForm.credits_amount <= 0) return alert('积分数必须大于0');
    }
    setActionLoading(true);
    const res = await adminAction(phone, 'batch_create_redemption_codes', {
      count: batchForm.count,
      prefix: batchForm.prefix || undefined,
      credits_amount: batchForm.code_type === 'subscription' ? 0 : batchForm.credits_amount,
      max_uses: batchForm.max_uses,
      code_type: batchForm.code_type,
      description: batchForm.description || undefined,
      expires_at: batchForm.expires_at || undefined,
      tier_id: batchForm.code_type === 'subscription' ? batchForm.tier_id : undefined,
    });
    setActionLoading(false);
    if (res.success) {
      setShowBatch(false);
      setBatchResult(res.codes || []);
      load();
    } else {
      alert(res.error || '批量创建失败');
    }
  };

  const handleToggle = async (codeId: string, currentActive: boolean) => {
    const res = await adminAction(phone, 'disable_redemption_code', { code_id: codeId, is_active: !currentActive });
    if (res.success) load();
    else alert(res.error || '操作失败');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (item: AdminRedemptionCode) => {
    if (!item.is_active) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">禁用</span>;
    if (item.expires_at && new Date(item.expires_at) < new Date()) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">已过期</span>;
    if (item.current_uses >= item.max_uses) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">已用完</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">启用</span>;
  };

  const getTypeBadge = (item: AdminRedemptionCode) => {
    if (item.code_type === 'subscription') {
      const tierName = item.tier_id ? (TIER_NAMES[item.tier_id] || item.tier_id) : '订阅';
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">订阅 {tierName}</span>;
    }
    if (item.code_type === 'new_user') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">新用户</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">推广</span>;
  };

  const formFieldClass = "w-full bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-content focus:outline-none focus:border-accent";
  const labelClass = "block text-xs text-content-tertiary mb-1";

  return (
    <div className="space-y-4">
      {/* 统计 */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-xs text-content-tertiary mb-1">总兑换码数</div>
            <div className="text-2xl font-bold text-blue-400">{stats.total_codes}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-content-tertiary mb-1">总兑换次数</div>
            <div className="text-2xl font-bold text-green-400">{stats.total_redemptions}</div>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center space-x-3">
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-4 py-2 flex items-center space-x-1.5">
          <Plus className="w-3.5 h-3.5" /><span>创建兑换码</span>
        </button>
        <button onClick={() => setShowBatch(true)} className="btn-secondary text-xs px-4 py-2 flex items-center space-x-1.5">
          <Plus className="w-3.5 h-3.5" /><span>批量创建</span>
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input className="w-full pl-9 pr-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent"
            placeholder="搜索码值/备注..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {/* 批量创建结果 */}
      {batchResult && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-content">批量创建成功 ({batchResult.length} 个)</span>
            <div className="flex items-center space-x-2">
              <button onClick={() => copyToClipboard(batchResult.join('\n'))} className="btn-secondary text-xs px-3 py-1.5 flex items-center space-x-1">
                <Copy className="w-3 h-3" /><span>复制全部</span>
              </button>
              <button onClick={() => setBatchResult(null)} className="text-content-tertiary hover:text-content"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto custom-scrollbar bg-surface-overlay rounded-lg p-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-mono text-content">
              {batchResult.map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* 兑换码列表 */}
      {loading ? <div className="text-center text-content-tertiary py-8">加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-content-tertiary border-b border-surface-border">
              <th className="text-left py-2 px-3">码值</th>
              <th className="text-right py-2 px-3">积分</th>
              <th className="text-center py-2 px-3">类型</th>
              <th className="text-center py-2 px-3">使用量</th>
              <th className="text-center py-2 px-3">状态</th>
              <th className="text-left py-2 px-3">过期时间</th>
              <th className="text-left py-2 px-3">备注</th>
              <th className="text-right py-2 px-3">操作</th>
            </tr></thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b border-surface-border hover:bg-surface-hover">
                  <td className="py-2 px-3 text-content font-mono text-[11px] font-semibold">{c.code}</td>
                  <td className="py-2 px-3 text-right">
                    {c.code_type === 'subscription' && c.tier_id
                      ? <span className="text-blue-400 font-semibold">{TIER_NAMES[c.tier_id] || c.tier_id}</span>
                      : <span className="text-accent font-semibold">{c.credits_amount}</span>
                    }
                  </td>
                  <td className="py-2 px-3 text-center">{getTypeBadge(c)}</td>
                  <td className="py-2 px-3 text-center text-content-secondary">{c.current_uses}/{c.max_uses}</td>
                  <td className="py-2 px-3 text-center">{getStatusBadge(c)}</td>
                  <td className="py-2 px-3 text-content-tertiary">{c.expires_at ? new Date(c.expires_at).toLocaleString('zh-CN') : '永不过期'}</td>
                  <td className="py-2 px-3 text-content-tertiary truncate max-w-[120px]">{c.description || '-'}</td>
                  <td className="py-2 px-3 text-right space-x-2">
                    <button onClick={() => copyToClipboard(c.code)} className="text-content-tertiary hover:text-content" title="复制"><Copy className="w-3.5 h-3.5 inline" /></button>
                    <button onClick={() => handleToggle(c.id, c.is_active)}
                      className={`text-xs ${c.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}>
                      {c.is_active ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-content-tertiary">暂无兑换码</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />

      {/* 创建兑换码弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content">创建兑换码</h3>
              <button onClick={() => setShowCreate(false)} className="text-content-tertiary hover:text-content"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className={labelClass}>兑换码（留空自动生成）</label>
              <input className={formFieldClass} placeholder="如 WELCOME2026" value={createForm.code}
                onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>类型</label>
                <select className={formFieldClass} value={createForm.code_type}
                  onChange={e => setCreateForm({ ...createForm, code_type: e.target.value, tier_id: '' })}>
                  <option value="promo">推广码</option>
                  <option value="new_user">新用户码</option>
                  <option value="subscription">订阅码</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>过期时间（可选）</label>
                <input type="datetime-local" className={formFieldClass} value={createForm.expires_at}
                  onChange={e => setCreateForm({ ...createForm, expires_at: e.target.value })} />
              </div>
            </div>
            {createForm.code_type === 'subscription' ? (
              <div>
                <label className={labelClass}>套餐 *</label>
                <select className={formFieldClass} value={createForm.tier_id}
                  onChange={e => setCreateForm({ ...createForm, tier_id: e.target.value })}>
                  <option value="">请选择套餐</option>
                  {PAID_TIERS.map(t => <option key={t} value={t}>{TIER_NAMES[t]}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>积分数 *</label>
                  <input type="number" className={formFieldClass} value={createForm.credits_amount}
                    onChange={e => setCreateForm({ ...createForm, credits_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelClass}>最大使用次数</label>
                  <input type="number" className={formFieldClass} value={createForm.max_uses}
                    onChange={e => setCreateForm({ ...createForm, max_uses: Number(e.target.value) })} />
                </div>
              </div>
            )}
            {createForm.code_type === 'subscription' && (
              <div>
                <label className={labelClass}>最大使用次数</label>
                <input type="number" className={formFieldClass} value={createForm.max_uses}
                  onChange={e => setCreateForm({ ...createForm, max_uses: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <label className={labelClass}>备注</label>
              <input className={formFieldClass} placeholder="备注说明" value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
            </div>
            <button onClick={handleCreate} disabled={actionLoading} className="w-full btn-primary text-sm py-2.5 disabled:opacity-50">
              {actionLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      )}

      {/* 批量创建弹窗 */}
      {showBatch && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowBatch(false)}>
          <div className="card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content">批量创建兑换码</h3>
              <button onClick={() => setShowBatch(false)} className="text-content-tertiary hover:text-content"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>数量 *</label>
                <input type="number" className={formFieldClass} value={batchForm.count}
                  onChange={e => setBatchForm({ ...batchForm, count: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelClass}>前缀（可选）</label>
                <input className={formFieldClass} placeholder="如 PROMO" value={batchForm.prefix}
                  onChange={e => setBatchForm({ ...batchForm, prefix: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>类型</label>
                <select className={formFieldClass} value={batchForm.code_type}
                  onChange={e => setBatchForm({ ...batchForm, code_type: e.target.value, tier_id: '' })}>
                  <option value="promo">推广码</option>
                  <option value="new_user">新用户码</option>
                  <option value="subscription">订阅码</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>过期时间（可选）</label>
                <input type="datetime-local" className={formFieldClass} value={batchForm.expires_at}
                  onChange={e => setBatchForm({ ...batchForm, expires_at: e.target.value })} />
              </div>
            </div>
            {batchForm.code_type === 'subscription' ? (
              <div>
                <label className={labelClass}>套餐 *</label>
                <select className={formFieldClass} value={batchForm.tier_id}
                  onChange={e => setBatchForm({ ...batchForm, tier_id: e.target.value })}>
                  <option value="">请选择套餐</option>
                  {PAID_TIERS.map(t => <option key={t} value={t}>{TIER_NAMES[t]}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>积分数 *</label>
                  <input type="number" className={formFieldClass} value={batchForm.credits_amount}
                    onChange={e => setBatchForm({ ...batchForm, credits_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelClass}>每码最大使用次数</label>
                  <input type="number" className={formFieldClass} value={batchForm.max_uses}
                    onChange={e => setBatchForm({ ...batchForm, max_uses: Number(e.target.value) })} />
                </div>
              </div>
            )}
            {batchForm.code_type === 'subscription' && (
              <div>
                <label className={labelClass}>每码最大使用次数</label>
                <input type="number" className={formFieldClass} value={batchForm.max_uses}
                  onChange={e => setBatchForm({ ...batchForm, max_uses: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <label className={labelClass}>备注</label>
              <input className={formFieldClass} placeholder="备注说明" value={batchForm.description}
                onChange={e => setBatchForm({ ...batchForm, description: e.target.value })} />
            </div>
            <button onClick={handleBatchCreate} disabled={actionLoading} className="w-full btn-primary text-sm py-2.5 disabled:opacity-50">
              {actionLoading ? '创建中...' : `批量创建 ${batchForm.count} 个`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 主页面
// ============================================================
const AdminPage: React.FC = () => {
  const { userPhone, userEmail, isAdmin } = useGeneration();
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const TABS_DATA: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('tabs.overview'), icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users', label: t('tabs.users'), icon: <Users className="w-4 h-4" /> },
    { id: 'orders', label: t('tabs.orders'), icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'tasks', label: t('tabs.tasks'), icon: <Activity className="w-4 h-4" /> },
    { id: 'subscriptions', label: t('tabs.subscriptions'), icon: <CreditCard className="w-4 h-4" /> },
    { id: 'api_keys', label: t('tabs.api_keys'), icon: <Key className="w-4 h-4" /> },
    { id: 'referrals', label: t('tabs.referrals'), icon: <Gift className="w-4 h-4" /> },
    { id: 'redemption', label: t('tabs.redemption'), icon: <Ticket className="w-4 h-4" /> },
  ];

  // 管理员标识：优先 phone，其次 email
  const adminId = userPhone || userEmail || '';

  if (!isAdmin || !adminId) {
    return (
      <div className="flex-1 flex items-center justify-center text-content-tertiary">
        {t('noAccess')}
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab phone={adminId} />;
      case 'users': return <UsersTab phone={adminId} />;
      case 'orders': return <OrdersTab phone={adminId} />;
      case 'tasks': return <TasksTab phone={adminId} />;
      case 'subscriptions': return <SubscriptionsTab phone={adminId} />;
      case 'api_keys': return <ApiKeysTab phone={adminId} />;
      case 'referrals': return <ReferralsTab phone={adminId} />;
      case 'redemption': return <RedemptionTab phone={adminId} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-surface-border">
        <h1 className="text-xl font-bold text-content mb-4">{t('title')}</h1>
        <div className="flex space-x-1">
          {TABS_DATA.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-content-tertiary hover:text-content hover:bg-surface-hover'
              }`}>
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {renderTab()}
      </div>
    </div>
  );
};

export default AdminPage;