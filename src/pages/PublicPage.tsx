import { useRef, useState } from 'react'
import {
  Alert, Button, Card, Col, Divider, Empty, Form, Input, List, Pagination, Row, Space,
  Spin, Statistic, Table, Tag, Typography, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FaHotel, FaWallet } from 'react-icons/fa'
import { FiArrowRight, FiCheckCircle, FiFileText, FiLock, FiLogOut, FiMoon, FiSun } from 'react-icons/fi'
import { supabase } from '../supabaseClient'
import { money, formatDateLong } from '../types'
import type { PublicSummaryRow, PublicExpenseRow } from '../types'
import { useTheme } from '../hooks/useTheme'

const { Title, Text } = Typography

const n = (v: unknown) => Number(v) || 0

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [5, 10, 20]

interface DeptTableRow {
  key: string
  label: string
  cash: number
  pos: number
  transfer: number
  total: number
}

/** Fetch one page of approved days (and the expenses for those same days). */

async function fetchPage(pw: string, page: number, pageSize: number) {
  const args = { pw, p_limit: pageSize, p_offset: (page - 1) * pageSize }
  const [s, x] = await Promise.all([
    supabase.rpc('get_public_daily_summary_paged', args),
    supabase.rpc('get_public_expenses_paged', args),
  ])
  return { s, x }
}




function friendlyError(...messages: (string | undefined)[]) {
  const msg = messages.join(' ').toLowerCase()
  return msg.includes('invalid password')
    ? 'Incorrect password.'
    : 'Could not load records. If you recently updated the database, make sure the pagination migration has been run.'
}

export function PublicPage({ onBack }: { onBack: () => void }) {
  const { token } = theme.useToken()
  const { dark, toggle } = useTheme()
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Kept in memory only so later pages can be requested; cleared on lock.
  const [pw, setPw] = useState('')

  const [summary, setSummary] = useState<PublicSummaryRow[]>([])
  const [expenses, setExpenses] = useState<PublicExpenseRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const latestRequest = useRef(0) // ignore out-of-order responses

  async function unlock({ password }: { password: string }) {
    setBusy(true)
    setError('')
    try {
      const [c, { s, x }] = await Promise.all([
        supabase.rpc('get_public_day_count', { pw: password }),
        fetchPage(password, 1, DEFAULT_PAGE_SIZE),
      ])
      if (c.error || s.error || x.error) {
        setError(friendlyError(c.error?.message, s.error?.message, x.error?.message))
        return
      }
      setPw(password)
      setTotal(n(c.data))
      setPage(1)
      setPageSize(DEFAULT_PAGE_SIZE)
      setSummary((s.data as PublicSummaryRow[]) || [])
      setExpenses(((x.data as PublicExpenseRow[]) || []).map((r) => ({ ...r, amount: n(r.amount) })))
      setUnlocked(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function goToPage(nextPage: number, nextSize: number) {
    const id = ++latestRequest.current
    setPageLoading(true)
    setPageError('')
    try {
      const { s, x } = await fetchPage(pw, nextPage, nextSize)
      if (id !== latestRequest.current) return
      if (s.error || x.error) {
        setPageError(friendlyError(s.error?.message, x.error?.message))
        return
      }
      setSummary((s.data as PublicSummaryRow[]) || [])
      setExpenses(((x.data as PublicExpenseRow[]) || []).map((r) => ({ ...r, amount: n(r.amount) })))
      setPage(nextPage)
      setPageSize(nextSize)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      if (id === latestRequest.current) setPageError('Something went wrong. Please try again.')
    } finally {
      if (id === latestRequest.current) setPageLoading(false)
    }
  }

  function lock() {
    latestRequest.current++
    setUnlocked(false)
    setPw('')
    setSummary([])
    setExpenses([])
    setTotal(0)
    setPage(1)
    setPageError('')
    setPageLoading(false)
  }

  /* ---------- Locked state ---------- */
  if (!unlocked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: token.colorBgLayout }}
      >
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="flex items-center justify-center rounded-xl mb-4 p-3"
              style={{ background: token.colorPrimary, color: '#fff' }}
            >
              <FaHotel size={30} />
            </div>
            <Title level={4} style={{ margin: 0 }}>Public daily records</Title>
            <Text type="secondary">Owner view — approved days only</Text>
          </div>

          <Card style={{ borderRadius: token.borderRadiusLG * 1.5 }}>
            <Form<{ password: string }> layout="vertical" onFinish={unlock} requiredMark={false} disabled={busy}>
              <Form.Item
                label="Shared password"
                name="password"
                rules={[{ required: true, message: 'Please enter the shared password' }]}
              >
                <Input.Password prefix={<FiLock />} autoFocus placeholder="••••••••" />
              </Form.Item>

              {error && (
                <Alert
                  type="error"
                  message={error}
                  showIcon
                  closable
                  onClose={() => setError('')}
                  style={{ marginBottom: 16 }}
                />
              )}

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={busy}
                icon={!busy ? <FiArrowRight /> : undefined}
                iconPosition="end"
              >
                {busy ? 'Checking…' : 'View records'}
              </Button>

              <div className="mt-5 text-center">
                <Button type="link" onClick={onBack} disabled={false}>
                  ← Back to staff sign in
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    )
  }

  /* ---------- Unlocked state ---------- */
  const pager = total > 0 && (
    <Pagination
      align="center"
      current={page}
      pageSize={pageSize}
      total={total}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      showSizeChanger
      showTotal={(t, [from, to]) => `${from}–${to} of ${t} days`}
      disabled={pageLoading}
      onChange={goToPage}
    />
  )

  return (
    <div className="min-h-screen" style={{ background: token.colorBgLayout }}>
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-16 backdrop-blur"
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg p-1.5"
          style={{ background: token.colorPrimary, color: '#fff' }}
        >
          <FaHotel size={20} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">Public daily records</div>
          <Text type="secondary" style={{ fontSize: 11 }}>Approved days only</Text>
        </div>
        <Space className="ml-auto" size={4}>
          <Button
            type="text"
            aria-label="Toggle dark mode"
            onClick={toggle}
            icon={dark ? <FiSun size={18} /> : <FiMoon size={18} />}
          />
          <Button icon={<FiLogOut />} onClick={lock}>Lock</Button>
        </Space>
      </header>

      <main className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {total === 0 && (
          <Card>
            <Empty
              description={
                <div>
                  <div>No approved days yet</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Once Chima signs off a day, its figures will appear here.
                  </Text>
                </div>
              }
            />
          </Card>
        )}

        {pager}

        {pageError && (
          <Alert
            type="error"
            showIcon
            message={pageError}
            action={<Button size="small" onClick={() => goToPage(page, pageSize)}>Retry</Button>}
          />
        )}

        <Spin spinning={pageLoading}>
          <div className="flex flex-col gap-4">
            {summary.map((row) => {
              const dayExpenses = expenses.filter((e) => e.entry_date === row.entry_date)
              return <DayCard key={row.entry_date} row={row} dayExpenses={dayExpenses} />
            })}
          </div>
        </Spin>

        {pager}

        <div className="text-center pb-4">
          <Button type="link" onClick={onBack}>← Back to staff sign in</Button>
        </div>
      </main>
    </div>
  )
}

/* ---------- Day card ---------- */

function DayCard({ row, dayExpenses }: { row: PublicSummaryRow; dayExpenses: PublicExpenseRow[] }) {
  const { token } = theme.useToken()

  const deptRows: DeptTableRow[] = [
    { key: 'room', label: 'Room', cash: n(row.room_cash), pos: n(row.room_pos), transfer: n(row.room_transfer), total: n(row.room_total) },
    { key: 'bar', label: 'Bar', cash: n(row.bar_cash), pos: n(row.bar_pos), transfer: n(row.bar_transfer), total: n(row.bar_total) },
    { key: 'kitchen', label: 'Kitchen', cash: n(row.kitchen_cash), pos: n(row.kitchen_pos), transfer: n(row.kitchen_transfer), total: n(row.kitchen_total) },
  ]

  const columns: ColumnsType<DeptTableRow> = [
    { title: 'Department', dataIndex: 'label', key: 'label' },
    { title: 'Cash', dataIndex: 'cash', key: 'cash', align: 'right', render: (v: number) => money(v) },
    { title: 'POS', dataIndex: 'pos', key: 'pos', align: 'right', render: (v: number) => money(v) },
    { title: 'Transfer', dataIndex: 'transfer', key: 'transfer', align: 'right', render: (v: number) => money(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: (v: number) => <Text strong>{money(v)}</Text> },
  ]

  const net = n(row.net)
  const netMinusPos = net - n(row.total_pos)
  return (
    <Card
      title={formatDateLong(row.entry_date)}
      extra={
        <Tag color="success" icon={<FiCheckCircle style={{ marginRight: 4, verticalAlign: '-2px' }} />}>
          Approved
        </Tag>
      }
    >
      {/* KPIs */}
      <Row gutter={8} style={{ marginBottom: 20 }}>
        {[
          { label: 'Income', value: money(n(row.total_income)), neg: false },
          { label: 'Expenses', value: money(n(row.total_expenses)), neg: false },
          { label: 'Net', value: money(net), neg: net < 0 },
        ].map((k) => (
          <Col span={8} key={k.label}>
            <Card size="small" styles={{ body: { background: token.colorFillQuaternary, borderRadius: token.borderRadius } }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>{k.label}</span>}
                value={k.value}
                valueStyle={{
                  fontSize: 16,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: k.neg ? token.colorError : undefined,
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Department breakdown */}
      <Table<DeptTableRow>
        size="small"
        pagination={false}
        columns={columns}
        dataSource={deptRows}
        scroll={{ x: 460 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><Text strong>All departments</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Text strong>{money(n(row.total_cash))}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Text strong>{money(n(row.total_pos))}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><Text strong>{money(n(row.total_transfer))}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><Text strong>{money(n(row.total_income))}</Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      {/* Expenses */}
      <Divider style={{ margin: '20px 0 12px' }} />
      <Space size={8} style={{ marginBottom: 8 }}>
        <FiFileText size={15} style={{ color: token.colorTextTertiary }} />
        <Text strong>Expenses</Text>
      </Space>

      {dayExpenses.length === 0 ? (
        <Text type="secondary" style={{ display: 'block' }}>None recorded.</Text>
      ) : (
        <List
          size="small"
          dataSource={dayExpenses}
          renderItem={(e) => (
            <List.Item style={{ justifyContent: 'space-between' }}>
              <Text>{e.description}</Text>
              <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(e.amount)}</Text>
            </List.Item>
          )}
        />
      )}

      <div className="flex justify-between pt-3 mt-1" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Text type="secondary">Total expenses</Text>
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(n(row.total_expenses))}</Text>
      </div>
      <div className="flex justify-between pt-3 mt-2" style={{ borderTop: `1px solid ${token.colorBorder}` }}>
        <Text strong style={{ fontSize: 16 }}>Net for the day</Text>
        <Text strong style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{money(net)}</Text>
      </div>
      <div className="flex justify-between pt-3 mt-2" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Text strong style={{ fontSize: 16 }}>Net for the day minus POS</Text>
        <Text
          strong
          style={{
            fontSize: 16,
            fontVariantNumeric: 'tabular-nums',
            color: netMinusPos < 0 ? token.colorError : undefined,
          }}
        >
          {money(netMinusPos)}
        </Text>
      </div>

      {/* Cash position */}
      <Divider style={{ margin: '20px 0 12px' }} />
      <Space size={8} style={{ marginBottom: 12 }}>
        <FaWallet size={15} style={{ color: token.colorTextTertiary }} />
        <Text strong>Cash position (as counted)</Text>
      </Space>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}><CashStat label="Account balance" value={n(row.account_balance)} /></Col>
        <Col xs={24} sm={8}><CashStat label="Cash with Manager" value={n(row.cash_manager)} /></Col>
        <Col xs={24} sm={8}><CashStat label="Cash with Chima" value={n(row.cash_chima)} /></Col>
      </Row>
    </Card>
  )
}

function CashStat({ label, value }: { label: string; value: number }) {
  const { token } = theme.useToken()
  return (
    <Card size="small" styles={{ body: { background: token.colorFillQuaternary, borderRadius: token.borderRadius } }}>
      <Statistic
        title={<span style={{ fontSize: 12 }}>{label}</span>}
        value={money(value)}
        valueStyle={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      />
    </Card>
  )
}