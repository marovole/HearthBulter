import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-900">Health Butler</h1>
          <p className="mb-8 text-xl text-gray-600">基于健康数据与电商库存的动态饮食引擎</p>

          <div className="rounded-lg bg-white p-8 shadow-xl">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">开始您的健康管理之旅</h2>
            <p className="mb-8 text-gray-600">
              通过科学的数据分析和个性化食谱，让健康管理变得更加简单有效
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="/auth/signin"
                className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
              >
                登录
              </a>
              <a
                href="/auth/signup"
                className="rounded-lg border border-blue-600 bg-white px-6 py-3 text-blue-600 transition-colors hover:bg-blue-50"
              >
                注册
              </a>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <span className="text-xl text-blue-600">📊</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">健康数据管理</h3>
              <p className="text-gray-600">
                记录和分析您和家人的健康数据，包括体重、体脂、血压等关键指标
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <span className="text-xl text-green-600">🥗</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">个性化食谱</h3>
              <p className="text-gray-600">根据健康目标和营养需求，AI为您生成科学的每日饮食计划</p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <span className="text-xl text-purple-600">🛒</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold">智能购物</h3>
              <p className="text-gray-600">根据食谱自动生成购物清单，一键下单所需食材，省时省力</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
