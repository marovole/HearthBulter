import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';

// NextAuth v5 配置
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

          // 测试用户验证
          if (email === 'test@example.com' && password === 'test123') {
            return {
              id: '1',
              email: 'test@example.com',
              name: '测试用户',
              role: 'USER',
            };
          }

          // 数据库用户验证
          try {
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
            console.warn('Database connection error in auth:', dbError);
            // 继续返回null，不暴露数据库错误
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
    strategy: 'jwt' as const,
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

export default NextAuth(authOptions);

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
