import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-16'>
        <div className='max-w-4xl mx-auto text-center'>
          <h1 className='text-4xl font-bold text-gray-900 mb-6'>
            Health Butler
          </h1>
          <p className='text-xl text-gray-600 mb-8'>
            基于健康数据与电商库存的动态饮食引擎
          </p>

          <div className='bg-white rounded-lg shadow-xl p-8'>
            <h2 className='text-2xl font-semibold text-gray-800 mb-4'>
              开始您的健康管理之旅
            </h2>
            <p className='text-gray-600 mb-8'>
              通过科学的数据分析和个性化食谱，让健康管理变得更加简单有效
            </p>

            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <a
                href='/auth/signin'
                className='bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors'
              >
                登录
              </a>
              <a
                href='/auth/signup'
                className='bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors'
              >
                注册
              </a>
            </div>
          </div>

          <div className='mt-16 grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='bg-white rounded-lg p-6 shadow-lg'>
              <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto'>
                <span className='text-blue-600 text-xl'>📊</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>健康数据管理</h3>
              <p className='text-gray-600'>
                记录和分析您和家人的健康数据，包括体重、体脂、血压等关键指标
              </p>
            </div>

            <div className='bg-white rounded-lg p-6 shadow-lg'>
              <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto'>
                <span className='text-green-600 text-xl'>🥗</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>个性化食谱</h3>
              <p className='text-gray-600'>
                根据健康目标和营养需求，AI为您生成科学的每日饮食计划
              </p>
            </div>

            <div className='bg-white rounded-lg p-6 shadow-lg'>
              <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto'>
                <span className='text-purple-600 text-xl'>🛒</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>智能购物</h3>
              <p className='text-gray-600'>
                根据食谱自动生成购物清单，一键下单所需食材，省时省力
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
