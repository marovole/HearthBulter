import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageCircle, Phone, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "联系我们 - Health Butler",
  description: "联系 Health Butler 团队，获取帮助和支持。",
};

export default function ContactPage() {
  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: "电子邮件",
      description: "发送邮件咨询问题",
      detail: "support@healthbutler.life",
      action: "发送邮件",
      href: "mailto:support@healthbutler.life",
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "在线客服",
      description: "工作日即时响应",
      detail: "周一至周五 9:00-18:00",
      action: "开始对话",
      href: "/help",
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: "电话支持",
      description: "专业客服一对一服务",
      detail: "400-123-4567",
      action: "拨打电话",
      href: "tel:400-123-4567",
    },
  ];

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
          <h1 className="text-3xl font-bold text-foreground">联系我们</h1>
          <p className="mt-2 text-muted-foreground">我们随时准备为您提供帮助和支持</p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-3">
          {contactMethods.map((method, index) => (
            <Card key={index} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {method.icon}
                </div>
                <CardTitle className="text-lg">{method.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm text-muted-foreground">{method.description}</p>
                <p className="mb-4 font-medium">{method.detail}</p>
                <Button asChild variant="outline" className="w-full">
                  <a href={method.href}>{method.action}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              服务时间
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-3 font-medium">客服工作时间</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>周一至周五</span>
                    <span className="font-medium text-foreground">9:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>周六</span>
                    <span className="font-medium text-foreground">10:00 - 16:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>周日及法定节假日</span>
                    <span className="text-muted-foreground">休息</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mb-3 font-medium">预计响应时间</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>在线客服</span>
                    <span className="font-medium text-green-600">即时响应</span>
                  </div>
                  <div className="flex justify-between">
                    <span>邮件支持</span>
                    <span className="font-medium text-yellow-600">24小时内</span>
                  </div>
                  <div className="flex justify-between">
                    <span>复杂问题</span>
                    <span className="font-medium text-blue-600">1-3个工作日</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              公司信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">公司名称：</strong>Health Butler 健康管家
              </p>
              <p>
                <strong className="text-foreground">商务合作：</strong>
                <a
                  href="mailto:business@healthbutler.life"
                  className="text-primary hover:underline"
                >
                  business@healthbutler.life
                </a>
              </p>
              <p>
                <strong className="text-foreground">技术支持：</strong>
                <a href="mailto:tech@healthbutler.life" className="text-primary hover:underline">
                  tech@healthbutler.life
                </a>
              </p>
              <p>
                <strong className="text-foreground">隐私相关：</strong>
                <a href="mailto:privacy@healthbutler.life" className="text-primary hover:underline">
                  privacy@healthbutler.life
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            还有其他问题？访问我们的{" "}
            <Link href="/help" className="text-primary hover:underline">
              帮助中心
            </Link>{" "}
            获取更多信息。
          </p>
        </div>
      </div>
    </main>
  );
}
