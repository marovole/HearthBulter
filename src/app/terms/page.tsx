import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "服务条款 - Health Butler",
  description: "Health Butler 服务条款，了解使用我们服务的条款和条件。",
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-foreground">服务条款</h1>
          <p className="mt-2 text-muted-foreground">最后更新日期：2024年12月</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold">1. 服务说明</h2>
            <p className="mt-4 text-muted-foreground">
              Health Butler
              是一款家庭健康管理平台，提供健康数据追踪、营养规划、智能食谱推荐等服务。使用本服务即表示您同意遵守本条款。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">2. 账户注册</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>您必须年满 16 周岁方可注册使用本服务</li>
              <li>注册时需提供真实、准确的个人信息</li>
              <li>您有责任保护账户安全，不得与他人共享登录凭据</li>
              <li>如发现账户被未经授权使用，请立即通知我们</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">3. 服务使用规范</h2>
            <p className="mt-4 text-muted-foreground">使用本服务时，您同意：</p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>遵守所有适用的法律法规</li>
              <li>不进行任何可能损害服务或其他用户的行为</li>
              <li>不尝试未经授权访问系统或数据</li>
              <li>不上传恶意软件、病毒或有害代码</li>
              <li>不进行自动化数据采集或爬取</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">4. 健康信息免责声明</h2>
            <p className="mt-4 text-muted-foreground">
              <strong>重要提示：</strong>
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>本服务提供的健康建议、营养规划仅供参考，不构成专业医疗建议</li>
              <li>如有健康问题，请咨询专业医疗人员</li>
              <li>我们不对基于本服务建议所做的健康决策承担责任</li>
              <li>本服务不能替代专业医疗诊断、治疗或建议</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">5. 知识产权</h2>
            <p className="mt-4 text-muted-foreground">
              Health Butler
              及其所有内容（包括但不限于软件、文本、图像、商标）均受知识产权法保护。未经书面许可，不得复制、修改或分发。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">6. 用户内容</h2>
            <p className="mt-4 text-muted-foreground">
              您上传的健康数据、食谱等内容归您所有。但您授予我们使用这些内容提供服务的权利。我们可能使用匿名化、聚合的数据改进服务。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">7. 服务变更与终止</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>我们保留随时修改或终止服务的权利</li>
              <li>重大变更将提前通知用户</li>
              <li>您可随时删除账户并终止使用服务</li>
              <li>违反条款可能导致账户被暂停或终止</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">8. 免责声明</h2>
            <p className="mt-4 text-muted-foreground">
              本服务按「现状」提供。在法律允许的最大范围内，我们不对服务的适用性、可靠性或准确性作任何明示或暗示的保证。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">9. 责任限制</h2>
            <p className="mt-4 text-muted-foreground">
              在法律允许的最大范围内，Health Butler
              对因使用或无法使用本服务而产生的任何间接、附带、特殊或后果性损害不承担责任。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">10. 适用法律</h2>
            <p className="mt-4 text-muted-foreground">
              本条款受中华人民共和国法律管辖。任何争议应首先通过友好协商解决；协商不成的，提交有管辖权的人民法院解决。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold">11. 联系方式</h2>
            <p className="mt-4 text-muted-foreground">如有任何关于本条款的问题，请联系：</p>
            <p className="mt-2 text-muted-foreground">电子邮件：legal@healthbutler.life</p>
          </section>
        </div>
      </div>
    </main>
  );
}
