import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "隐私政策 - Health Butler",
  description: "Health Butler 隐私政策，了解我们如何保护您的个人信息。",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-foreground">隐私政策</h1>
          <p className="mt-2 text-muted-foreground">最后更新日期：2024年12月</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold">1. 信息收集</h2>
            <p className="mt-4 text-muted-foreground">
              Health Butler（以下简称「我们」）非常重视用户的隐私保护。我们收集的信息包括：
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>账户信息：姓名、电子邮件地址、密码（加密存储）</li>
              <li>健康数据：体重、身高、血压、血糖等您主动录入的健康指标</li>
              <li>使用数据：应用使用习惯、功能访问记录</li>
              <li>设备信息：设备类型、操作系统版本（用于优化体验）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">2. 信息使用</h2>
            <p className="mt-4 text-muted-foreground">我们使用收集的信息用于：</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>提供和改进我们的健康管理服务</li>
              <li>生成个性化的健康建议和食谱推荐</li>
              <li>发送重要的服务通知和更新</li>
              <li>分析使用趋势以优化产品体验</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">3. 信息保护</h2>
            <p className="mt-4 text-muted-foreground">我们采用业界标准的安全措施保护您的数据：</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>所有数据传输使用 TLS 1.3 加密</li>
              <li>敏感数据在存储时进行加密处理</li>
              <li>定期进行安全审计和漏洞扫描</li>
              <li>严格的内部访问控制和权限管理</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">4. 信息共享</h2>
            <p className="mt-4 text-muted-foreground">
              我们不会出售您的个人信息。仅在以下情况下可能共享信息：
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>获得您的明确同意</li>
              <li>与服务提供商合作（如云存储服务），且要求其遵守保密义务</li>
              <li>法律法规要求或政府机关依法要求</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">5. 您的权利</h2>
            <p className="mt-4 text-muted-foreground">您有权：</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>访问和导出您的个人数据</li>
              <li>更正不准确的个人信息</li>
              <li>请求删除您的账户和相关数据</li>
              <li>撤回对数据处理的同意</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">6. Cookie 使用</h2>
            <p className="mt-4 text-muted-foreground">
              我们使用必要的 Cookie 来维持您的登录状态和偏好设置。您可以通过浏览器设置管理 Cookie
              偏好。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">7. 儿童隐私</h2>
            <p className="mt-4 text-muted-foreground">
              我们的服务面向 16 岁及以上用户。如果我们发现无意中收集了儿童信息，将立即删除。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">8. 政策更新</h2>
            <p className="mt-4 text-muted-foreground">
              我们可能会不时更新本隐私政策。重大变更将通过应用内通知或电子邮件告知您。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">9. 联系我们</h2>
            <p className="mt-4 text-muted-foreground">如有任何隐私相关问题，请联系我们：</p>
            <p className="mt-2 text-muted-foreground">电子邮件：privacy@healthbutler.life</p>
          </section>
        </div>
      </div>
    </main>
  );
}
