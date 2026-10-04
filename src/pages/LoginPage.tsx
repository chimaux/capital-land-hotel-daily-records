import { useState } from 'react'
import { Alert, Button, Card, Form, Input, Typography, theme } from 'antd'
import { FaHotel } from 'react-icons/fa'
import { FiArrowRight, FiLock, FiMail } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'

const { Title, Text } = Typography

interface LoginValues {
  email: string
  password: string
}

export function LoginPage({ onGoPublic }: { onGoPublic: () => void }) {
  const { signIn } = useAuth()
  const { token } = theme.useToken()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleFinish({ email, password }: LoginValues) {
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
    } catch (err: any) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

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
          <Title level={4} style={{ margin: 0 }}>Sign in to Ledger</Title>
          <Text type="secondary">Hotel daily records</Text>
        </div>

        <Card style={{ borderRadius: token.borderRadiusLG * 1.5 }}>
          <Form<LoginValues>
            layout="vertical"
            onFinish={handleFinish}
            requiredMark={false}
            disabled={busy}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                prefix={<FiMail />}
                autoFocus
                autoComplete="username"
                placeholder="you@hotel.com"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<FiLock />}
                autoComplete="current-password"
                placeholder="••••••••"
              />
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
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="mt-5 text-center">
              <Button type="link" onClick={onGoPublic} disabled={false}>
                View public records →
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  )
}