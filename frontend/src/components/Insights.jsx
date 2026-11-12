import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getAnalytics } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { DemoTag } from './Results'

const INK = '#0b0b10'
const PINK = '#f19ac0'
const BLUE = '#7aa7e8'
const PIE = [INK, PINK, BLUE, '#c6c0ec']

function Panel({ title, children }) {
  return (
    <figure className="rounded-2xl border border-ink/80 bg-white/60 p-4">
      <figcaption className="mb-3 text-[11px] uppercase tracking-widest">{title}</figcaption>
      <div className="h-64">{children}</div>
    </figure>
  )
}

export default function Insights() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    getAnalytics(token).then(d => live && setData(d)).catch(e => live && setErr(e.message))
    return () => { live = false }
  }, [token])

  return (
    <section id="insights" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <p className="flex items-center gap-3 text-xs uppercase tracking-widest opacity-70">02 · Insights {data?.demo && <DemoTag />}</p>
      <h2 className="mt-2 font-display text-3xl uppercase leading-none md:text-5xl">How well is it reading?</h2>

      {err && <p role="alert" className="mt-6 text-sm text-red-700">{err}</p>}
      {!data && !err && <p className="mt-6 text-sm opacity-70">Loading analytics…</p>}

      {data && (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Panel title="Scans per day">
            <ResponsiveContainer>
              <BarChart data={data.scans}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b0b1022" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="character" name="Letters" stackId="a" fill={INK} />
                <Bar dataKey="word" name="Words" stackId="a" fill={PINK} />
                <Bar dataKey="essay" name="Essays" stackId="a" fill={BLUE} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Average confidence (%)">
            <ResponsiveContainer>
              <LineChart data={data.confidence}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0b0b1022" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="Confidence" stroke={INK} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Essay issues by type">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.issues} dataKey="count" nameKey="type" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {data.issues.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}
    </section>
  )
}
