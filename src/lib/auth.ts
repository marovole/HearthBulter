import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const authConfig: NextAuthConfig = {
  providers: [
    // 密码认证
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

          // 暂时跳过数据库验证，只进行基础检查
          // TODO: 修复数据库连接后恢复完整的用户验证
          
          // 为了测试，创建一个临时用户
          if (credentials.email === 'test@example.com' && credentials.password === 'test123') {
            return {
              id: '1',
              email: 'test@example.com',
              name: '测试用户',
              role: 'USER',
            };
          }

          // 尝试数据库查询（如果连接可用）
          try {
            const user = await prisma.user.findUnique({
              where: { email: credentials.email as string },
            });

            if (user && user.password) {
              const passwordMatch = await bcrypt.compare(credentials.password as string, user.password);
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
            console.warn('Database connection failed, using fallback auth:', dbError);
          }

          return null;
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),

    // Google OAuth认证（暂时禁用，需要配置 OAuth 凭据）
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID || '',
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    // }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// 导出authOptions用于向后兼容
export const authOptions = authConfig;

// Helper函数：获取当前用户会话
export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}
