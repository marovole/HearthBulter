'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SignUpPage() {
  const { data: session, status } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  const validatePassword = (password: string) => {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      setIsLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('密码必须至少8个字符，包含字母和数字');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('注册成功！正在跳转到登录页面...');
        setTimeout(() => router.push('/auth/signin'), 2000);
      } else {
        setError(data.error || '注册失败，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    '智能健康数据追踪',
    'AI 营养规划',
    '全家健康管理',
    '永久免费使用',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent via-accent to-warning relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <span className="font-display text-2xl font-bold text-white">
                Health Butler
              </span>
            </div>
            
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              开启您的
              <br />
              健康新生活
            </h1>
            
            <p className="text-white/80 text-lg max-w-md mb-8">
              免费注册，即刻获得智能健康管理服务，让科技守护您和家人的健康。
            </p>

            {/* Features list */}
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 text-white"
                >
                  <div className="p-1 rounded-full bg-white/20">
                    <Check className="w-4 h-4" />
                  </div>
                  {feature}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="p-2 rounded-xl bg-accent/10">
              <Heart className="w-6 h-6 text-accent" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Health Butler
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              创建账户
            </h2>
            <p className="text-muted-foreground">
              已有账户？{' '}
              <Link href="/auth/signin" className="text-primary font-medium hover:underline">
                立即登录
              </Link>
            </p>
          </div>

          <Card variant="ghost" className="border-0 shadow-none">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    姓名
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none transition-colors"
                      placeholder="您的姓名"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Email field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none transition-colors"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    至少8个字符，包含字母和数字
                  </p>
                </div>

                {/* Confirm Password field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none transition-colors"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-lg bg-success/10 text-success text-sm">
                    {success}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  variant="glow"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? '注册中...' : '创建账户'}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-2">
                  注册即表示您同意我们的{' '}
                  <Link href="#" className="underline hover:text-foreground">服务条款</Link>
                  {' '}和{' '}
                  <Link href="#" className="underline hover:text-foreground">隐私政策</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
