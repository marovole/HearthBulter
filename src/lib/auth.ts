import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma, testDatabaseConnection } from '@/lib/db';
import { getServerSession } from 'next-auth/next';

// NextAuth v4 配置
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const email = credentials.email as string;
          const password = credentials.password as string;

          // 数据库用户验证
          try {
            // 首先测试数据库连接
            const dbConnected = await testDatabaseConnection();
            if (!dbConnected) {
              console.error('数据库连接失败');
              return null;
            }

            const user = await prisma.user.findUnique({
              where: { email },
            });

            if (user && user.password) {
              const passwordMatch = await bcrypt.compare(password, user.password);
              if (passwordMatch) {
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                };
              }
            }
          } catch (dbError) {
            console.error('数据库认证错误:', dbError);
          }

          return null;
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as string) || 'USER';
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler };

// Helper函数：获取当前用户会话
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Auth函数：供API路由和页面组件使用
// 这是 NextAuth v4 的标准认证函数
export const auth = () => getServerSession(authOptions);

// 认证系统健康检查
export async function testAuthSystem() {
  try {
    const session = await getServerSession(authOptions);
    return {
      healthy: !!session,
      user: session?.user || null,
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      user: null,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// 认证配置检查
export function checkAuthConfiguration() {
  const issues: string[] = [];

  // 检查必需的环境变量
  if (!process.env.NEXTAUTH_SECRET) {
    issues.push('NEXTAUTH_SECRET 未设置');
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    issues.push('NEXTAUTH_SECRET 长度不足32字符');
  }

  if (!process.env.NEXTAUTH_URL) {
    issues.push('NEXTAUTH_URL 未设置');
  }

  return {
    configured: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  };
}
