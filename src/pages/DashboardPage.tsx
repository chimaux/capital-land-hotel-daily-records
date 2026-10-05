import { useEffect, useState } from 'react'
import {
  Button, Card, Col, DatePicker, Divider, Empty, Form, Input, InputNumber, List, Modal,
  Row, Select, Skeleton, Space, Statistic, Tag, Typography,
} from 'antd'
import dayjs from 'dayjs'
import { FaBed, FaGlassMartiniAlt, FaHandHoldingUsd, FaMoneyBillWave, FaUtensils, FaWallet } from 'react-icons/fa'
import { FiCheck, FiCheckCircle, FiClock, FiLock, FiPlus, FiShield, FiTrash2 } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { supabase } from '../supabaseClient'
import { TotalsCard } from '../components/TotalsCard'
import { toast } from '../components/Toaster'
import type { Profile, DepartmentEntry, Expense, CashPosition, CashBalance, DayApproval, Department, PaymentMethod } from '../types'
import { DEPARTMENT_BY_ROLE, DEPARTMENT_LABEL, money, todayISO, yesterdayISO } from '../types'

const { Text } = Typography

// Fixed colors (antd default light values) — no theme tokens.
const COLOR = {
  primary: '#1677ff',
  success: '#52c41a',
  fillQuaternary: 'rgba(0, 0, 0, 0.02)',
  border: '#d9d9d9',
  borderSecondary: '#f0f0f0',
  textQuaternary: 'rgba(0, 0, 0, 0.25)',
  radius: 6,
}
const SOFT_BODY = { background: COLOR.fillQuaternary, borderRadius: COLOR.radius }

const DEPT_ICON: Record<Department, IconType> = {
  room: FaBed,
  bar: FaGlassMartiniAlt,
  kitchen: FaUtensils,
}

function isLateForDate(date: string) {
  return date < todayISO() && new Date().getHours() >= 14
}

type Amount = number | null

interface DeptDraft { cash: Amount; pos: Amount; transfer: Amount; handed_manager: Amount; handed_chima: Amount }
interface CashDraft {
  account_balance: Amount
  cash_manager: Amount // counted cash with Manager (null = use expected closing)
  cash_chima: Amount   // counted cash with Chima (null = use expected closing)
  opening_manager: Amount // only used on the very first day
  opening_chima: Amount
}

const emptyBalance = (date: string): CashBalance => ({
  bal_date: date,
  opening_manager: 0, received_manager: 0, paid_manager: 0, expected_manager: 0, closing_manager: 0,
  opening_chima: 0, received_chima: 0, paid_chima: 0, expected_chima: 0, closing_chima: 0,
  has_previous: true,
})

const num = (n: Amount) => n ?? 0
const orNull = (n: number | undefined) => (n ? n : null)

function timeAgo(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function MoneyField({
  label, value, onChange, placeholder = '0',
}: { label: string; value: Amount; onChange: (v: Amount) => void; placeholder?: string }) {
  return (
    <Form.Item label={label} style={{ marginBottom: 0 }}>
      <InputNumber<number>
        min={0}
        placeholder={placeholder}
        inputMode="decimal"
        style={{ width: '100%' }}
        value={value}
        onChange={(v) => onChange(v ?? null)}
      />
    </Form.Item>
  )
}

function CardHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Space size={8}>
      <span style={{ color: COLOR.primary, display: 'inline-flex' }}>{icon}</span>
      {children}
    </Space>
  )
}

function CashStat({ label, value }: { label: string; value: number }) {
  return (
    <Card size="small" styles={{ body: SOFT_BODY }}>
      <Statistic
        title={<span style={{ fontSize: 12 }}>{label}</span>}
        value={money(value)}
        valueStyle={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      />
    </Card>
  )
}

function LedgerLine({ label, value, sign, bold }: { label: string; value: number; sign?: '+' | '−'; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <Text strong={bold} type={bold ? undefined : 'secondary'}>{sign ? `${sign} ` : ''}{label}</Text>
      <Text strong={bold} style={{ fontVariantNumeric: 'tabular-nums' }}>{money(value)}</Text>
    </div>
  )
}

/** One person's cash for the day: opening + received - paid out = closing. */
function CashLedger({
  title, opening, received, paid, expected, closing, children,
}: {
  title: string; opening: number; received: number; paid: number; expected: number; closing: number
  children?: React.ReactNode
}) {
  const variance = closing - expected
  return (
    <Card size="small" styles={{ body: SOFT_BODY }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>{title}</Text>
      <LedgerLine label="Opening (from previous day)" value={opening} />
      <LedgerLine label="Received today" value={received} sign="+" />
      <LedgerLine label="Paid out (cash expenses)" value={paid} sign="−" />
      <div style={{ borderTop: `1px solid ${COLOR.borderSecondary}`, margin: '4px 0' }} />
      <LedgerLine label="Expected closing" value={expected} />
      {children && <div style={{ marginTop: 12 }}>{children}</div>}
      <div style={{ borderTop: `1px solid ${COLOR.border}`, margin: '8px 0 4px' }} />
      <LedgerLine label="Closing balance" value={closing} bold />
      {variance !== 0 && (
        <Tag color={variance < 0 ? 'error' : 'warning'} style={{ marginTop: 4 }}>
          Counted {variance < 0 ? 'short' : 'over'} by {money(Math.abs(variance))}
        </Tag>
      )}
    </Card>
  )
}

function ExpenseGroup({
  title, items, approved, onDelete, canDelete,
}: {
  title: string
  items: Expense[]
  approved: boolean
  onDelete: (e: Expense) => void
  canDelete: (e: Expense) => boolean
}) {
  if (items.length === 0) return null
  const subtotal = items.reduce((s, e) => s + e.amount, 0)
  return (
    <div style={{ marginBottom: 12 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Text strong>{title}</Text>
        <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(subtotal)}</Text>
      </Space>
      <List
        size="small"
        dataSource={items}
        renderItem={(e) => (
          <List.Item
            key={e.id}
            actions={
              canDelete(e)
                ? [
                  <Button
                    key="del"
                    type="text"
                    danger
                    size="small"
                    aria-label={`Delete ${e.description}`}
                    icon={<FiTrash2 />}
                    disabled={approved}
                    onClick={() => onDelete(e)}
                  />,
                ]
                : []
            }
          >
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space size={8}>
                <Text>{e.description}</Text>
                <Tag color={e.payment_method === 'transfer' ? 'blue' : undefined} style={{ marginInlineEnd: 0 }}>
                  {e.payment_method === 'transfer' ? 'Transfer' : 'Cash'}
                </Tag>
              </Space>
              <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(e.amount)}</Text>
            </Space>
          </List.Item>
        )}
      />
    </div>
  )
}

export function DashboardPage({ profile }: { profile: Profile }) {
  const [date, setDate] = useState(yesterdayISO())
  const [entries, setEntries] = useState<DepartmentEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [cashSaved, setCashSaved] = useState<CashPosition | null>(null)
  const [approval, setApproval] = useState<DayApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [deptDraft, setDeptDraft] = useState<DeptDraft>({ cash: null, pos: null, transfer: null, handed_manager: null, handed_chima: null })
  const [cashDraft, setCashDraft] = useState<CashDraft>({ account_balance: null, cash_manager: null, cash_chima: null, opening_manager: null, opening_chima: null })
  const [expDesc, setExpDesc] = useState('')
  const [expAmt, setExpAmt] = useState<Amount>(null)
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash')
  const [balance, setBalance] = useState<CashBalance>(emptyBalance(date))
  const [toDelete, setToDelete] = useState<Expense | null>(null)
  const [confirmReopen, setConfirmReopen] = useState(false)

  const myDept = DEPARTMENT_BY_ROLE[profile.role]
  const canManage = profile.role === 'manager' || profile.role === 'chima'
  const isChima = profile.role === 'chima'
  const approved = approval?.approved ?? false

  async function loadAll(d: string, showSkeleton = true) {
    if (showSkeleton) setLoading(true)
    try {
      const [en, ex, ca, ap, bl] = await Promise.all([
        supabase.from('department_entries').select('*').eq('entry_date', d),
        supabase.from('expenses').select('*, creator:profiles!created_by(role)').eq('entry_date', d).order('created_at'),
        supabase.from('cash_positions').select('*').eq('entry_date', d).maybeSingle(),
        supabase.from('day_approvals').select('*').eq('entry_date', d).maybeSingle(),
        supabase.rpc('cash_balances', { upto: d }),
      ])
      if (en.error || ex.error || ca.error || ap.error || bl.error) throw new Error('load')
      const ent = ((en.data as DepartmentEntry[]) || []).map((e) => ({
        ...e,
        cash: Number(e.cash),
        pos: Number(e.pos),
        transfer: Number(e.transfer),
        handed_manager: Number(e.handed_manager) || 0,
        handed_chima: Number(e.handed_chima) || 0,
      }))
      setEntries(ent)
      setExpenses(((ex.data as Expense[]) || []).map((e) => ({ ...e, amount: Number(e.amount) })))
      const cp = ca.data as CashPosition | null
      setCashSaved(cp)
      setApproval((ap.data as DayApproval) || null)
      const row = ((bl.data as any[]) || []).find((r) => r.bal_date === d)
      const b = emptyBalance(d)
      if (row) {
        for (const k of Object.keys(b) as (keyof CashBalance)[]) {
          if (k === 'bal_date') continue
          if (k === 'has_previous') b.has_previous = !!row.has_previous
          else (b as any)[k] = Number(row[k]) || 0
        }
      }
      setBalance(b)
      const mine = ent.find((e) => e.department === myDept)
      setDeptDraft({
        cash: orNull(mine?.cash),
        pos: orNull(mine?.pos),
        transfer: orNull(mine?.transfer),
        handed_manager: orNull(mine?.handed_manager),
        handed_chima: orNull(mine?.handed_chima),
      })
      setCashDraft({
        account_balance: orNull(cp ? Number(cp.account_balance) : 0),
        // null = "no count entered, use the expected closing"
        cash_manager: cp?.cash_manager_override != null ? Number(cp.cash_manager_override) : null,
        cash_chima: cp?.cash_chima_override != null ? Number(cp.cash_chima_override) : null,
        opening_manager: cp?.opening_manager_manual != null ? Number(cp.opening_manager_manual) : null,
        opening_chima: cp?.opening_chima_manual != null ? Number(cp.opening_chima_manual) : null,
      })
    } catch {
      toast('Could not load this date. Check your connection.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const chimaExpenses = expenses.filter((e) => e.creator?.role === 'chima')
  const managerExpenses = expenses.filter((e) => e.creator?.role === 'manager')
  const otherExpenses = expenses.filter((e) => e.creator?.role !== 'chima' && e.creator?.role !== 'manager')
  const myEntry = entries.find((e) => e.department === myDept)

  // Chima can remove any expense; the Manager can only remove ones he entered himself.
  const canDeleteExpense = (e: Expense) => isChima || (profile.role === 'manager' && e.created_by === profile.id)

  const handedTotal = num(deptDraft.handed_manager) + num(deptDraft.handed_chima)
  const handedTooMuch = handedTotal > num(deptDraft.cash)

  async function run(key: string, okMsg: string, fn: () => Promise<{ error: { message: string } | null }>) {
    setSaving(key)
    try {
      const { error } = await fn()
      if (error) throw error
      toast(okMsg)
      await loadAll(date, false)
      return true
    } catch (err: any) {
      toast(err?.message || 'Save failed. Please try again.', 'error')
      return false
    } finally {
      setSaving(null)
    }
  }

  const saveDept = () =>
    run('dept', `${DEPARTMENT_LABEL[myDept!]} entry saved`, async () =>
      supabase.from('department_entries').upsert(
        {
          entry_date: date,
          department: myDept,
          cash: num(deptDraft.cash),
          pos: num(deptDraft.pos),
          transfer: num(deptDraft.transfer),
          handed_manager: num(deptDraft.handed_manager),
          handed_chima: num(deptDraft.handed_chima),
        },
        { onConflict: 'entry_date,department' }
      )
    )

  async function addExpense() {
    const amount = expAmt ?? 0
    if (!expDesc.trim() || amount <= 0) {
      toast('Enter a description and an amount above zero.', 'error')
      return
    }
    const ok = await run('exp', 'Expense added', async () =>
      supabase.from('expenses').insert({
        entry_date: date,
        description: expDesc.trim(),
        amount,
        created_by: profile.id,
        // Manager expenses are always paid from cash (also enforced in the database).
        payment_method: isChima ? expMethod : 'cash',
      })
    )
    if (ok) {
      setExpDesc('')
      setExpAmt(null)
      setExpMethod('cash')
    }
  }

  async function deleteExpense() {
    if (!toDelete?.id) return
    const id = toDelete.id
    await run('del', 'Expense removed', async () => {
      const { data, error } = await supabase.from('expenses').delete().eq('id', id).select('id')
      // A row blocked by security rules returns no error but deletes nothing.
      if (!error && (!data || data.length === 0)) {
        return { error: { message: 'You are not allowed to delete this expense.' } }
      }
      return { error }
    })
    setToDelete(null)
  }

  const saveCash = () =>
    run('cash', 'Cash position saved', async () =>
      supabase.from('cash_positions').upsert(
        {
          entry_date: date,
          account_balance: num(cashDraft.account_balance),
          // null = no count entered, closing balance = expected
          cash_manager_override: cashDraft.cash_manager,
          cash_chima_override: cashDraft.cash_chima,
          // Opening balances are typed in only on the very first day; later days carry forward.
          ...(balance.has_previous
            ? {}
            : { opening_manager_manual: cashDraft.opening_manager, opening_chima_manual: cashDraft.opening_chima }),
        },
        { onConflict: 'entry_date' }
      )
    )

  async function setApproved(next: boolean) {
    await run('appr', next ? 'Day approved — now visible on Public View' : 'Day reopened for edits', async () =>
      supabase.from('day_approvals').upsert(
        { entry_date: date, approved: next, approved_by: next ? profile.id : null, approved_at: next ? new Date().toISOString() : null },
        { onConflict: 'entry_date' }
      )
    )
    setConfirmReopen(false)
  }

  // Approval checklist (Chima)
  const has = (d: Department) => entries.some((e) => e.department === d)
  const checklist = [
    { label: 'Room sales entered', ok: has('room'), required: true },
    { label: 'Bar sales entered', ok: has('bar'), required: true },
    { label: 'Kitchen sales entered', ok: has('kitchen'), required: true },
    { label: 'Cash position counted', ok: !!cashSaved, required: true },
    { label: expenses.length ? `${expenses.length} expense${expenses.length > 1 ? 's' : ''} logged` : 'No expenses logged (optional)', ok: expenses.length > 0, required: false },
  ]
  const ready = checklist.every((c) => !c.required || c.ok)

  const DeptIcon = myDept ? DEPT_ICON[myDept] : null

  return (
    <div>
      {/* Page toolbar */}
      <Space wrap size={[16, 12]} align="end" style={{ marginBottom: 24 }}>
        <Form layout="vertical" style={{ width: 208 }}>
          <Form.Item label="Date" style={{ marginBottom: 0 }}>
            <DatePicker
              allowClear={false}
              style={{ width: '100%' }}
              value={dayjs(date)}
              disabledDate={(d) => d.isAfter(dayjs(), 'day')}
              onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
            />
          </Form.Item>
        </Form>
        <Space wrap size={8} style={{ paddingBottom: 4 }}>
          {!loading && (
            approved ? (
              <Tag color="success" icon={<FiCheckCircle style={{ marginRight: 4, verticalAlign: '-2px' }} />}>
                Approved — visible on Public View
              </Tag>
            ) : (
              <Tag icon={<FiClock style={{ marginRight: 4, verticalAlign: '-2px' }} />}>
                Awaiting Chima's approval — not yet public
              </Tag>
            )
          )}
          {isLateForDate(date) && !approved && (
            <Tag color="warning" icon={<FiClock style={{ marginRight: 4, verticalAlign: '-2px' }} />}>
              Late entry — past the 2pm cutoff
            </Tag>
          )}
        </Space>
      </Space>

      {loading ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={canManage ? 16 : 24}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>
              <Card><Skeleton active paragraph={{ rows: 5 }} /></Card>
            </Space>
          </Col>
          {canManage && (
            <Col xs={24} lg={8}>
              <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
            </Col>
          )}
        </Row>
      ) : (
        <Row gutter={[16, 16]} align="top">
          {/* LEFT: full width for staff, 2/3 width for manager & Chima */}
          <Col xs={24} lg={canManage ? 16 : 24}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {myDept && DeptIcon && (
                <Card
                  title={<CardHeading icon={<DeptIcon size={17} />}>{DEPARTMENT_LABEL[myDept]} sales</CardHeading>}
                  extra={myEntry?.updated_at ? <Text type="secondary" style={{ fontSize: 12 }}>Saved {timeAgo(myEntry.updated_at)}</Text> : undefined}
                >
                  <Form layout="vertical" disabled={approved}>
                    <Row gutter={12} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}><MoneyField label="Cash" value={deptDraft.cash} onChange={(v) => setDeptDraft({ ...deptDraft, cash: v })} /></Col>
                      <Col xs={24} sm={8}><MoneyField label="POS" value={deptDraft.pos} onChange={(v) => setDeptDraft({ ...deptDraft, pos: v })} /></Col>
                      <Col xs={24} sm={8}><MoneyField label="Transfer" value={deptDraft.transfer} onChange={(v) => setDeptDraft({ ...deptDraft, transfer: v })} /></Col>
                    </Row>

                    <Divider style={{ margin: '4px 0 16px' }} />
                    <Space size={8} style={{ marginBottom: 12 }}>
                      <FaHandHoldingUsd size={16} style={{ color: COLOR.primary }} />
                      <Text strong>Cash with Manager and Chima</Text>
                    </Space>
                    <Row gutter={12} style={{ marginBottom: handedTooMuch ? 8 : 16 }}>
                      <Col xs={24} sm={12}><MoneyField label="Manager" value={deptDraft.handed_manager} onChange={(v) => setDeptDraft({ ...deptDraft, handed_manager: v })} /></Col>
                      <Col xs={24} sm={12}><MoneyField label="Chima" value={deptDraft.handed_chima} onChange={(v) => setDeptDraft({ ...deptDraft, handed_chima: v })} /></Col>
                    </Row>
                    {handedTooMuch && (
                      <Text type="warning" style={{ display: 'block', fontSize: 12, marginBottom: 16 }}>
                        Handed over ({money(handedTotal)}) is more than the cash sales entered ({money(num(deptDraft.cash))}).
                      </Text>
                    )}
                  </Form>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      Total {money(num(deptDraft.cash) + num(deptDraft.pos) + num(deptDraft.transfer))}
                    </Text>
                    <Button type="primary" disabled={approved} loading={saving === 'dept'} onClick={saveDept}>
                      Save {DEPARTMENT_LABEL[myDept]} entry
                    </Button>
                  </Space>
                  {approved && (
                    <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                      <FiLock size={14} /> This day is approved and locked.
                    </Text>
                  )}
                </Card>
              )}

              {canManage && (
                <>
                  <Card
                    title={<CardHeading icon={<FaMoneyBillWave size={17} />}>Expenses</CardHeading>}
                    extra={<Text type="secondary" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{money(totalExpenses)}</Text>}
                  >
                    <Form layout="vertical" disabled={approved}>
                      <Row gutter={12} align="bottom" style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={9}>
                          <Form.Item label="Description" style={{ marginBottom: 0 }}>
                            <Input
                              value={expDesc}
                              placeholder="e.g. Diesel for generator"
                              onChange={(e) => setExpDesc(e.target.value)}
                              onPressEnter={addExpense}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} sm={5}>
                          <Form.Item label="Amount" style={{ marginBottom: 0 }}>
                            <InputNumber<number>
                              min={0}
                              placeholder="0"
                              inputMode="decimal"
                              style={{ width: '100%' }}
                              value={expAmt}
                              onChange={(v) => setExpAmt(v ?? null)}
                              onPressEnter={addExpense}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} sm={5}>
                          <Form.Item
                            label="Paid from"
                            style={{ marginBottom: 0 }}
                            tooltip={isChima ? undefined : 'Manager expenses are always paid from cash'}
                          >
                            <Select<PaymentMethod>
                              value={isChima ? expMethod : 'cash'}
                              disabled={!isChima || approved}
                              onChange={setExpMethod}
                              options={[
                                { value: 'cash', label: 'Cash' },
                                { value: 'transfer', label: 'Transfer' },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={5}>
                          <Button
                            type="primary"
                            block
                            icon={<FiPlus />}
                            disabled={approved}
                            loading={saving === 'exp'}
                            onClick={addExpense}
                          >
                            Add
                          </Button>
                        </Col>
                      </Row>
                    </Form>

                    {expenses.length === 0 ? (
                      <Empty
                        image={<FaMoneyBillWave size={28} style={{ color: COLOR.textQuaternary }} />}
                        description={
                          <div>
                            <div>No expenses recorded yet</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Add each expense one at a time so the owner can see the itemised list.
                            </Text>
                          </div>
                        }
                      />
                    ) : (
                      <>
                        <ExpenseGroup title="Entered by Chima" items={chimaExpenses} approved={approved} onDelete={setToDelete} canDelete={canDeleteExpense} />
                        <ExpenseGroup title="Entered by Manager" items={managerExpenses} approved={approved} onDelete={setToDelete} canDelete={canDeleteExpense} />
                        <ExpenseGroup title="Earlier entries (author not recorded)" items={otherExpenses} approved={approved} onDelete={setToDelete} canDelete={canDeleteExpense} />
                        <div className="flex justify-between pt-3" style={{ borderTop: `1px solid ${COLOR.border}` }}>
                          <Text strong>Total expenses</Text>
                          <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(totalExpenses)}</Text>
                        </div>
                      </>
                    )}
                  </Card>

                  <Card
                    title={<CardHeading icon={<FaWallet size={17} />}>Cash position</CardHeading>}
                    extra={cashSaved
                      ? <Text type="secondary" style={{ fontSize: 12 }}>Counted</Text>
                      : <Text type="warning" style={{ fontSize: 12 }}>Not counted yet</Text>}
                  >
                    {isChima ? (
                      <Form layout="vertical" disabled={approved}>
                        <Row gutter={12} style={{ marginBottom: 16 }}>
                          <Col xs={24} sm={12}>
                            <MoneyField label="Current account balance" value={cashDraft.account_balance} onChange={(v) => setCashDraft({ ...cashDraft, account_balance: v })} />
                          </Col>
                        </Row>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            <CashLedger
                              title="Cash with Manager"
                              opening={balance.opening_manager}
                              received={balance.received_manager}
                              paid={balance.paid_manager}
                              expected={balance.expected_manager}
                              closing={balance.closing_manager}
                            >
                              {!balance.has_previous && (
                                <div style={{ marginBottom: 12 }}>
                                  <MoneyField label="Opening balance (first day only)" value={cashDraft.opening_manager} onChange={(v) => setCashDraft({ ...cashDraft, opening_manager: v })} />
                                </div>
                              )}
                              <MoneyField label="Counted cash (optional)" placeholder={String(balance.expected_manager)} value={cashDraft.cash_manager} onChange={(v) => setCashDraft({ ...cashDraft, cash_manager: v })} />
                            </CashLedger>
                          </Col>
                          <Col xs={24} md={12}>
                            <CashLedger
                              title="Cash with Chima"
                              opening={balance.opening_chima}
                              received={balance.received_chima}
                              paid={balance.paid_chima}
                              expected={balance.expected_chima}
                              closing={balance.closing_chima}
                            >
                              {!balance.has_previous && (
                                <div style={{ marginBottom: 12 }}>
                                  <MoneyField label="Opening balance (first day only)" value={cashDraft.opening_chima} onChange={(v) => setCashDraft({ ...cashDraft, opening_chima: v })} />
                                </div>
                              )}
                              <MoneyField label="Counted cash (optional)" placeholder={String(balance.expected_chima)} value={cashDraft.cash_chima} onChange={(v) => setCashDraft({ ...cashDraft, cash_chima: v })} />
                            </CashLedger>
                          </Col>
                        </Row>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, margin: '12px 0 16px' }}>
                          Leave "Counted cash" empty to use the expected closing. If you enter a count, it becomes the closing balance and carries to tomorrow. "Reset to automatic" clears both counts; click Save cash position afterwards to keep the change.
                        </Text>
                        <Space>
                          <Button type="primary" disabled={approved} loading={saving === 'cash'} onClick={saveCash}>
                            Save cash position
                          </Button>
                          <Button
                            disabled={approved || (cashDraft.cash_manager === null && cashDraft.cash_chima === null)}
                            onClick={() => setCashDraft({ ...cashDraft, cash_manager: null, cash_chima: null })}
                          >
                            Reset to automatic
                          </Button>
                        </Space>
                      </Form>
                    ) : (
                      <>
                        <div style={{ marginBottom: 12, maxWidth: 280 }}>
                          <CashStat label="Current account balance" value={cashSaved ? Number(cashSaved.account_balance) : 0} />
                        </div>
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            <CashLedger
                              title="Cash with Manager"
                              opening={balance.opening_manager}
                              received={balance.received_manager}
                              paid={balance.paid_manager}
                              expected={balance.expected_manager}
                              closing={balance.closing_manager}
                            />
                          </Col>
                          <Col xs={24} md={12}>
                            <CashLedger
                              title="Cash with Chima"
                              opening={balance.opening_chima}
                              received={balance.received_chima}
                              paid={balance.paid_chima}
                              expected={balance.expected_chima}
                              closing={balance.closing_chima}
                            />
                          </Col>
                        </Row>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 12 }}>
                          Received comes from what each department handed over. Only Chima can enter the account balance and counted cash.
                        </Text>
                      </>
                    )}
                  </Card>
                </>
              )}
            </Space>
          </Col>

          {/* RIGHT: Day totals + approval, only for manager & Chima */}
          {canManage && (
            <Col xs={24} lg={8}>
              <div style={{ position: 'sticky', top: 96 }}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <TotalsCard entries={entries} totalExpenses={totalExpenses} />

                  {isChima && (
                    <Card title={<CardHeading icon={<FiShield size={17} />}>Approval</CardHeading>}>
                      {approved ? (
                        <>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                            Approved{approval?.approved_at ? ` on ${timeAgo(approval.approved_at)}` : ''}. Figures are locked and visible on the Public View.
                          </Text>
                          <Button block onClick={() => setConfirmReopen(true)} disabled={saving === 'appr'}>
                            Reopen for edits
                          </Button>
                        </>
                      ) : (
                        <>
                          <List
                            size="small"
                            split={false}
                            style={{ marginBottom: 16 }}
                            dataSource={checklist}
                            renderItem={(c) => (
                              <List.Item key={c.label} style={{ padding: '4px 0', justifyContent: 'flex-start', gap: 10 }}>
                                <span
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: c.ok ? COLOR.success : 'transparent',
                                    border: c.ok ? 'none' : `1px solid ${COLOR.border}`,
                                    color: c.ok ? '#fff' : 'transparent',
                                  }}
                                >
                                  <FiCheck size={12} strokeWidth={3} />
                                </span>
                                <Text type={c.ok ? undefined : 'secondary'}>{c.label}</Text>
                              </List.Item>
                            )}
                          />
                          <Button
                            type="primary"
                            block
                            disabled={!ready}
                            loading={saving === 'appr'}
                            onClick={() => setApproved(true)}
                          >
                            Sign &amp; approve this day
                          </Button>
                          {!ready && (
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                              Complete the required items to approve.
                            </Text>
                          )}
                        </>
                      )}
                    </Card>
                  )}
                </Space>
              </div>
            </Col>
          )}
        </Row>
      )}

      <Modal
        open={!!toDelete}
        title="Delete this expense?"
        okText="Delete"
        okButtonProps={{ danger: true }}
        confirmLoading={saving === 'del'}
        onOk={deleteExpense}
        onCancel={() => setToDelete(null)}
        destroyOnClose
      >
        {toDelete ? `${toDelete.description} — ${money(toDelete.amount)} will be removed from ${date}.` : ''}
      </Modal>

      <Modal
        open={confirmReopen}
        title="Reopen this day?"
        okText="Reopen"
        confirmLoading={saving === 'appr'}
        onOk={() => setApproved(false)}
        onCancel={() => setConfirmReopen(false)}
        destroyOnClose
      >
        The day will unlock for edits and disappear from the Public View until you approve it again.
      </Modal>
    </div>
  )
}