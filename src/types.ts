export type Role = 'receptionist' | 'bartender' | 'chef' | 'manager' | 'chima'
export type Department = 'room' | 'bar' | 'kitchen'

export interface Profile {
  id: string
  role: Role
  display_name: string | null
}

export interface DepartmentEntry {
  entry_date: string
  department: Department
  cash: number
  pos: number
  transfer: number
  /** Cash this department handed to the Manager / to Chima. */
  handed_manager: number
  handed_chima: number
  updated_at?: string
}

export interface Expense {
  id?: number
  entry_date: string
  description: string
  amount: number
  created_by?: string | null
  created_at?: string
  creator?: { role: Role } | null
}

export interface CashPosition {
  entry_date: string
  account_balance: number
  cash_manager: number
  cash_chima: number
  /** Set only when Chima overrides the automatic totals; null = use department handovers. */
  cash_manager_override?: number | null
  cash_chima_override?: number | null
}

export interface DayApproval {
  entry_date: string
  approved: boolean
  approved_by: string | null
  approved_at: string | null
}

export const ROLE_LABEL: Record<Role, string> = {
  receptionist: 'Receptionist · Room',
  bartender: 'Bartender · Bar',
  chef: 'Chef · Kitchen',
  manager: 'Manager',
  chima: 'Chima',
}

export const DEPARTMENT_LABEL: Record<Department, string> = {
  room: 'Room',
  bar: 'Bar',
  kitchen: 'Kitchen',
}

export const DEPARTMENT_BY_ROLE: Partial<Record<Role, Department>> = {
  receptionist: 'room',
  bartender: 'bar',
  chef: 'kitchen',
}

export function emptyEntry(department: Department, date: string): DepartmentEntry {
  return { entry_date: date, department, cash: 0, pos: 0, transfer: 0, handed_manager: 0, handed_chima: 0 }
}

function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return localISO(new Date())
}

export function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localISO(d)
}

export function money(n: number): string {
  return '₦' + (Number(n) || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })
}

export function formatDateLong(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export interface PublicSummaryRow {
  entry_date: string
  room_cash: number; room_pos: number; room_transfer: number; room_total: number
  bar_cash: number; bar_pos: number; bar_transfer: number; bar_total: number
  kitchen_cash: number; kitchen_pos: number; kitchen_transfer: number; kitchen_total: number
  total_cash: number; total_pos: number; total_transfer: number; total_income: number
  total_expenses: number; net: number
  account_balance: number; cash_manager: number; cash_chima: number
}

export interface PublicExpenseRow {
  entry_date: string
  description: string
  amount: number
}