"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Activity,
  Apple,
  Heart,
  Plus,
  Menu,
  X,
  Home,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentMember?: string;
  familyMembers?: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }>;
}

const navigation = [
  { id: "overview", name: "概览", icon: Home, href: "/dashboard" },
  { id: "health", name: "健康数据", icon: Activity, href: "/health-data" },
  { id: "nutrition", name: "营养分析", icon: Apple, href: "/meal-planning" },
  { id: "family", name: "家庭成员", icon: Users, href: "/dashboard" },
  { id: "score", name: "健康评分", icon: Heart, href: "/dashboard" },
  { id: "settings", name: "设置", icon: Settings, href: "/dashboard" },
];

export function DashboardLayout({
  children,
  currentMember,
  familyMembers = [],
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useClerk();
  const pathname = usePathname() ?? "";

  const getActiveTab = () => {
    if (pathname === "/dashboard") return "overview";
    if (pathname.includes("health")) return "health";
    if (pathname.includes("meal") || pathname.includes("nutrition")) return "nutrition";
    return "overview";
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-border bg-card lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-6">
          {/* Logo */}
          <Link href="/" className="mb-8 flex items-center px-6">
            <div className="mr-3 rounded-xl bg-primary/10 p-2">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Health Butler</span>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>

          {/* Family Members */}
          {familyMembers.length > 0 && (
            <div className="mt-4 border-t border-border px-3 pt-4">
              <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                家庭成员
              </h3>
              <div className="space-y-1">
                {familyMembers.map((member) => (
                  <button
                    key={member.id}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      currentMember === member.id
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "mr-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        currentMember === member.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <span className="truncate">{member.name}</span>
                  </button>
                ))}
                <button className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Plus className="h-4 w-4" />
                  </div>
                  添加成员
                </button>
              </div>
            </div>
          )}

          {/* Sign out */}
          <div className="mt-auto border-t border-border px-3 pt-4">
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-3 h-5 w-5" />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-soft-xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center">
                <div className="mr-3 rounded-xl bg-primary/10 p-2">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <span className="font-display text-lg font-bold">Health Butler</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {navigation.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex flex-1 items-center justify-end gap-4">
              <Button size="sm" variant="soft">
                <Plus className="mr-2 h-4 w-4" />
                添加数据
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
