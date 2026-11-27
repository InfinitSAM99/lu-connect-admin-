import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const tooltipStyle = {
  background: '#0a0a0a',
  border: '1px solid #1f1f1f',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
};

const axisTick = { fontSize: 11, fill: '#6d7382', fontWeight: 600 };

// ─────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────
export function ChartCard({ title, subtitle, action, children, style }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 20, padding: 24, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 0.2 }}>{title}</div>
          {subtitle && <div style={{ color: '#6d7382', fontSize: 12, fontWeight: 600, marginTop: 6 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, trend, color = '#ef4444' }) {
  const positive = trend >= 0;
  return (
    <div style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #050505 100%)', border: '1px solid #1f1f1f', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon && <Icon width={20} height={20} style={{ color }} />}
        </div>
        {trend !== undefined && (
          <div style={{ fontSize: 13, fontWeight: 800, color: positive ? '#22c55e' : '#ef4444', padding: '4px 8px', borderRadius: 8, background: positive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
            {positive ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ color: '#fff', fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, marginTop: 6 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {label}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Area Chart — with massive gradient
// ─────────────────────────────────────────────────────────────
export function AreaChartCard({ title, subtitle, action, data, dataKey = 'count', color = '#ef4444', height = 260, xLabel = 'label' }) {
  const gradientId = `grad-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <ChartCard title={title} subtitle={subtitle} action={action}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="50%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1a1a1a" vertical={false} />
          <XAxis dataKey={xLabel} tick={axisTick} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(data.length / 4) - 1)} />
          <YAxis tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333', strokeWidth: 1 }} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 6, fill: color, stroke: '#000', strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Bar Chart — big and vibrant
// ─────────────────────────────────────────────────────────────
export function BarChartCard({ title, subtitle, action, data, dataKey = 'count', color = '#3b82f6', height = 240, xLabel = 'label', interval = 3 }) {
  return (
    <ChartCard title={title} subtitle={subtitle} action={action}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1a1a1a" vertical={false} />
          <XAxis dataKey={xLabel} tick={axisTick} interval={interval} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Donut Chart — thick, with center
// ─────────────────────────────────────────────────────────────
export function DonutChartCard({ title, subtitle, action, data, totalLabel, height = 260 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ChartCard title={title} subtitle={subtitle} action={action}>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={65} paddingAngle={4} stroke="none" cornerRadius={6}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color || '#6b7280'} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>{total.toLocaleString()}</div>
          <div style={{ color: '#6d7382', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{totalLabel || 'Total'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: d.color || '#6b7280' }} />
              <span style={{ color: '#e5e5e5', fontWeight: 700, textTransform: 'capitalize' }}>{d.name}</span>
            </div>
            <span style={{ color: '#6d7382', fontWeight: 700 }}>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Heatmap
// ─────────────────────────────────────────────────────────────
export function HeatmapCard({ title, subtitle, action, matrix }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const max = Math.max(1, ...Object.values(matrix || {}).flat());

  const getColor = (v) => {
    if (!v) return '#0f0f0f';
    const intensity = Math.min(1, v / max);
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(239, 68, 68, ${alpha})`;
  };

  return (
    <ChartCard title={title} subtitle={subtitle} action={action}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {days.map((day) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 34, color: '#6d7382', fontSize: 11, fontWeight: 700 }}>{day}</div>
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {hours.map((h) => (
                <div
                  key={h}
                  title={`${day} ${h}:00 — ${matrix?.[day]?.[h] || 0}`}
                  style={{
                    flex: 1, height: 18, borderRadius: 4,
                    background: getColor(matrix?.[day]?.[h]),
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#6d7382', fontSize: 10, fontWeight: 700 }}>
          <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>12AM</span>
        </div>
      </div>
    </ChartCard>
  );
}

// ─────────────────────────────────────────────────────────────
// Leaderboard
// ─────────────────────────────────────────────────────────────
export function LeaderboardCard({ title, subtitle, action, items }) {
  return (
    <ChartCard title={title} subtitle={subtitle} action={action}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.length === 0 ? (
          <div style={{ color: '#6d7382', fontSize: 13, textAlign: 'center', padding: 20 }}>No data yet</div>
        ) : items.map((item, i) => (
          <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 26, color: '#6d7382', fontSize: 14, fontWeight: 900, textAlign: 'center' }}>{i + 1}</div>
            <img src={item.image || `https://api.dicebear.com/7.x/initials/svg?seed=${item.name}`} alt="" style={{ width: 44, height: 44, borderRadius: 10, background: '#1a1a1a', objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ color: '#6d7382', fontSize: 12, marginTop: 3 }}>{item.meta}</div>
            </div>
            <div style={{ color: '#ef4444', fontSize: 14, fontWeight: 900 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
