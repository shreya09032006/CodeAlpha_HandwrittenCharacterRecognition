import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import { PageHeader } from '../components/ui'
import { Panel, DemoTag } from '../components/Results'
import SignInGate from '../components/SignInGate'
import { getAnalytics } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const INK = '#0b0b10', PINK = '#f4a3c4', DEEP = '#e8709f', LAV = '#b9b0ea'
const tip = {
  contentStyle: { borderRadius: 16, border: '1px solid rgba(255,255,255,.8)', background: 'rgba(255,255,255,.9)', fontSize: 12 },
  cursor: { fill: 'rgba(11,11,16,.05)' },
}
const axis = { tick: { fontSize: 11, fill: INK }, axisLine: false, tickLine: false }

function Stat({ label, value }) {
  return (
    <div className="glass pop rounded-[28px] p-6">
      <p className="text-[11px] uppercase tracking-[.16em] opacity-60">{label}</p>
      <p className="mt-3 font-display text-5xl uppercase leading-none">{value}</p>
    </div>
  )
}

const Skeleton = () => (
  <div className="grid gap-4 lg:grid-cols-3">
    {[0, 1, 2].map(i => <div key={i} className="glass h-72 animate-pulse rounded-[32px]" />)}
  </div>
)

export default function InsightsPage() {
  const { enabled, user, token } = useAuth()
  const gated = enabled && !user
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (gated) return
    let live = true
    setData(null); setErr('')
    getAnalytics(token).then(d => live && setData(d)).catch(e => live && setErr(e.message))
    return () => { live = false }
  }, [gated, token])

  const stats = useMemo(() => {
    if (!data) return null
    const t = data.scans.reduce((a, d) => ({ c: a.c + d.character, w: a.w + d.word, e: a.e + d.essay }), { c: 0, w: 0, e: 0 })
    const avg = data.confidence.length ? Math.round(data.confidence.reduce((a, d) => a + d.value, 0) / data.confidence.length) : 0
    const top = [...data.issues].sort((a, b) => b.count - a.count)[0]
    return { total: t.c + t.w + t.e, avg, essays: t.e, top: top ? top.type : '—' }
  }, [data])

  return (
    <div className="mx-auto max-w-6xl px-5">
      <PageHeader index="04 · Insights" title="Insights" sub="How much you have scanned, how sure the models were, and which mistakes show up most in your essays." />

      {gated ? (
        <SignInGate text="Your analytics are personal. Sign in to see how your own scans are doing." />
      ) : err ? (
        <p role="alert" className="text-sm text-red-700">{err}</p>
      ) : !data ? (
        <Skeleton />
      ) : stats.total === 0 ? (
        <div className="glass rounded-[40px] px-8 py-20 text-center">
          <p className="font-display text-3xl uppercase">Nothing here yet</p>
          <p className="mt-3 text-sm opacity-70">Upload your first image and your numbers will appear.</p>
        </div>
      ) : (
        <>
          {data.demo && <div className="mb-4"><DemoTag /></div>}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total scans" value={stats.total} />
            <Stat label="Avg confidence" value={`${stats.avg}%`} />
            <Stat label="Essays corrected" value={stats.essays} />
            <Stat label="Top mistake" value={stats.top} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel label="Scans per day">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={data.scans} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke="rgba(11,11,16,.08)" />
                    <XAxis dataKey="day" {...axis} />
                    <YAxis allowDecimals={false} {...axis} width={28} />
                    <Tooltip {...tip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="character" name="Letters" stackId="a" fill={INK} />
                    <Bar dataKey="word" name="Words" stackId="a" fill={PINK} />
                    <Bar dataKey="essay" name="Essays" stackId="a" fill={LAV} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel label="Average confidence (%)">
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={data.confidence}>
                    <CartesianGrid vertical={false} stroke="rgba(11,11,16,.08)" />
                    <XAxis dataKey="day" {...axis} />
                    <YAxis domain={[60, 100]} {...axis} width={28} />
                    <Tooltip {...tip} />
                    <Line type="monotone" dataKey="value" name="Confidence" stroke={DEEP} strokeWidth={3} dot={{ r: 4, fill: INK, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel label="Essay issues by type">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.issues} dataKey="count" nameKey="type" innerRadius={52} outerRadius={84} paddingAngle={3} stroke="none">
                      {data.issues.map((_, i) => <Cell key={i} fill={[INK, PINK, LAV, DEEP][i % 4]} />)}
                    </Pie>
                    <Tooltip {...tip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
