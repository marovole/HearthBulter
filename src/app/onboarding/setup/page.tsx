'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, User, Calendar, Target } from 'lucide-react';
import Link from 'next/link';

interface FamilyMember {
  id: string
  name: string
  age: string
  gender: string
  relationship: string
  healthGoals: string[]
}

export default function SetupPage() {
  const router = useRouter();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    {
      id: '1',
      name: '',
      age: '',
      gender: '',
      relationship: '',
      healthGoals: [],
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [healthGoals, setHealthGoals] = useState('');

  const steps = [
    { title: '家庭成员', description: '添加您的家庭成员' },
    { title: '健康目标', description: '设置家庭的健康目标' },
    { title: '完成设置', description: '查看并确认您的设置' },
  ];

  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: '',
      age: '',
      gender: '',
      relationship: '',
      healthGoals: [],
    };
    setFamilyMembers([...familyMembers, newMember]);
  };

  const removeFamilyMember = (id: string) => {
    if (familyMembers.length > 1) {
      setFamilyMembers(familyMembers.filter(member => member.id !== id));
    }
  };

  const updateFamilyMember = (id: string, field: keyof FamilyMember, value: any) => {
    setFamilyMembers(familyMembers.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    ));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save setup and redirect to dashboard
      localStorage.setItem('family-setup', JSON.stringify(familyMembers));
      localStorage.setItem('health-goals', healthGoals);
      localStorage.setItem('onboarding-completed', 'true');
      router.push('/dashboard');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {steps[currentStep].title}
          </h1>
          <p className="text-gray-600">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {currentStep === 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-semibold">家庭成员设置</h2>
                  </div>
                  <Button onClick={addFamilyMember} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    添加成员
                  </Button>
                </div>

                <div className="space-y-4">
                  {familyMembers.map((member, index) => (
                    <div key={member.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline">成员 {index + 1}</Badge>
                        {familyMembers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFamilyMember(member.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`name-${member.id}`}>姓名 *</Label>
                          <Input
                            id={`name-${member.id}`}
                            value={member.name}
                            onChange={(e) => updateFamilyMember(member.id, 'name', e.target.value)}
                            placeholder="请输入姓名"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`age-${member.id}`}>年龄 *</Label>
                          <Input
                            id={`age-${member.id}`}
                            value={member.age}
                            onChange={(e) => updateFamilyMember(member.id, 'age', e.target.value)}
                            placeholder="请输入年龄"
                            type="number"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`gender-${member.id}`}>性别 *</Label>
                          <Select value={member.gender} onValueChange={(value) => updateFamilyMember(member.id, 'gender', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择性别" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">男</SelectItem>
                              <SelectItem value="female">女</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`relationship-${member.id}`}>关系 *</Label>
                          <Select value={member.relationship} onValueChange={(value) => updateFamilyMember(member.id, 'relationship', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="请选择关系" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="self">本人</SelectItem>
                              <SelectItem value="spouse">配偶</SelectItem>
                              <SelectItem value="child">子女</SelectItem>
                              <SelectItem value="parent">父母</SelectItem>
                              <SelectItem value="other">其他</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <div className="flex items-center space-x-2 mb-6">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">健康目标设置</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="health-goals">家庭健康目标</Label>
                    <Textarea
                      id="health-goals"
                      value={healthGoals}
                      onChange={(e) => setHealthGoals(e.target.value)}
                      placeholder="请描述您和家人的健康目标，例如：减重、改善血压、增强体质等..."
                      className="min-h-32"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">常见的健康目标参考：</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 体重管理：达到理想体重或维持健康体重</li>
                      <li>• 血压控制：维持血压在正常范围内</li>
                      <li>• 血糖管理：控制血糖水平，预防糖尿病</li>
                      <li>• 营养均衡：确保每日营养摄入均衡</li>
                      <li>• 增强体质：通过饮食改善整体健康状况</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    设置完成！
                  </h2>
                  <p className="text-gray-600">
                    请确认您的设置信息
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2 text-blue-600" />
                      家庭成员 ({familyMembers.length}人)
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {familyMembers.map((member, index) => (
                        <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <span className="font-medium">{member.name || `成员${index + 1}`}</span>
                          <span className="text-sm text-gray-500">
                            {member.age}岁 • {member.gender === 'male' ? '男' : '女'} • {member.relationship || '未设置'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {healthGoals && (
                    <div>
                      <h3 className="font-medium mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-blue-600" />
                        健康目标
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700">{healthGoals}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ 设置已完成！您现在可以开始使用 Health Butler 的所有功能了。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                上一步
              </Button>
            )}
            {currentStep === 0 && (
              <Link href="/onboarding/welcome">
                <Button variant="outline">
                  返回欢迎页
                </Button>
              </Link>
            )}
          </div>

          <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
            {currentStep === steps.length - 1 ? '完成设置' : '下一步'}
          </Button>
        </div>
      </div>
    </div>
  );
}
