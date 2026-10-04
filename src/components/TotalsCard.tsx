import { Card, Col, Row, Statistic, Table, Typography, theme } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { money } from '../types'
import type { DepartmentEntry } from '../types'

const { Text } = Typography

interface Props {
  entries: DepartmentEntry[]
  totalExpenses: number
}

interface DeptRow {
  key: string
  label: string
  cash: number
  pos: number
  transfer: number
  total: number
}

const DEPTS = [
  { key: 'room', label: 'Room' },
  { key: 'bar', label: 'Bar' },
  { key: 'kitchen', label: 'Kitchen' },
] as const

export function TotalsCard({ entries, totalExpenses }: Props) {
  const { token } = theme.useToken()

  const rows: DeptRow[] = DEPTS.map((d) => {
    const e = entries.find((x) => x.department === d.key)
    const cash = e?.cash ?? 0
    const pos = e?.pos ?? 0
    const transfer = e?.transfer ?? 0
    return { key: d.key, label: d.label, cash, pos, transfer, total: cash + pos + transfer }
  })

  const cash = rows.reduce((s, r) => s + r.cash, 0)
  const pos = rows.reduce((s, r) => s + r.pos, 0)
  const transfer = rows.reduce((s, r) => s + r.transfer, 0)
  const income = cash + pos + transfer
  const net = income - totalExpenses
  const netMinusPos = net - pos

  const columns: ColumnsType<DeptRow> = [
    { title: 'Dept', dataIndex: 'label', key: 'label' },
    { title: 'Cash', dataIndex: 'cash', key: 'cash', align: 'right', render: (v: number) => money(v) },
    { title: 'POS', dataIndex: 'pos', key: 'pos', align: 'right', render: (v: number) => money(v) },
    { title: 'Transfer', dataIndex: 'transfer', key: 'transfer', align: 'right', render: (v: number) => money(v) },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: (v: number) => <Text strong>{money(v)}</Text> },
  ]

  const kpis = [
    { label: 'Income', value: money(income), neg: false },
    { label: 'Expenses', value: money(totalExpenses), neg: false },
    { label: 'Net', value: money(net), neg: net < 0 },
  ]

  return (
    <Card title="Day totals">
      <Row gutter={8} style={{ marginBottom: 20 }}>
        {kpis.map((k) => (
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

      <Table<DeptRow>
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 460 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><Text strong>All departments</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Text strong>{money(cash)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Text strong>{money(pos)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><Text strong>{money(transfer)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><Text strong>{money(income)}</Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <div className="flex justify-between pt-3 mt-3" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Text type="secondary">Total expenses</Text>
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(totalExpenses)}</Text>
      </div>
      <div className="flex justify-between pt-3 mt-2" style={{ borderTop: `1px solid ${token.colorBorder}` }}>
        <Text strong style={{ fontSize: 16 }}>Net for the day</Text>
        <Text strong style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', color: net < 0 ? token.colorError : undefined }}>
          {money(net)}
        </Text>
      </div>
      <div className="flex justify-between pt-3 mt-2" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <Text strong style={{ fontSize: 16 }}>Net for the day minus POS</Text>
        <Text strong style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', color: netMinusPos < 0 ? token.colorError : undefined }}>
          {money(netMinusPos)}
        </Text>
      </div>
    </Card>
  )
}