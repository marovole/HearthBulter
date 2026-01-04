'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  Info,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bug,
  Wheat,
  Fish,
  Milk,
  Egg,
  TreePine,
  Shell,
  Cookie,
} from 'lucide-react';

interface Allergen {
  id: string;
  name: string;
  category: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  description: string;
  symptoms: string[];
  icon: React.ReactNode;
  color: string;
}

interface Ingredient {
  id: string;
  name: string;
  allergens?: string[];
}

interface AllergenIdentifierProps {
  ingredients: Ingredient[];
  userAllergens?: string[];
  showDetails?: boolean;
  onAllergenClick?: (allergen: string) => void;
}

const COMMON_ALLERGENS: Allergen[] = [
  {
    id: 'peanut',
    name: '花生',
    category: '坚果类',
    severity: 'SEVERE',
    description: '花生是最常见的食物过敏原之一，可能引起严重的过敏反应',
    symptoms: ['皮肤瘙痒', '荨麻疹', '呼吸困难', '过敏性休克'],
    icon: <Cookie className='h-4 w-4' />,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    id: 'tree_nut',
    name: '坚果',
    category: '坚果类',
    severity: 'SEVERE',
    description: '包括核桃、杏仁、腰果等各种树生坚果',
    symptoms: ['口腔瘙痒', '消化不良', '呼吸困难', '血压下降'],
    icon: <TreePine className='h-4 w-4' />,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    id: 'shellfish',
    name: '贝类',
    category: '海鲜类',
    severity: 'SEVERE',
    description: '包括虾、蟹、龙虾、蛤蜊等贝类海鲜',
    symptoms: ['面部肿胀', '呼吸困难', '恶心呕吐', '过敏性休克'],
    icon: <Shell className='h-4 w-4' />,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    id: 'fish',
    name: '鱼类',
    category: '海鲜类',
    severity: 'MODERATE',
    description: '各种鱼类，如鲑鱼、金枪鱼、鳕鱼等',
    symptoms: ['皮肤反应', '胃肠道症状', '呼吸道症状'],
    icon: <Fish className='h-4 w-4' />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'milk',
    name: '牛奶',
    category: '乳制品',
    severity: 'MODERATE',
    description: '牛奶及乳制品中的蛋白质过敏原',
    symptoms: ['腹泻', '腹痛', '皮疹', '呕吐'],
    icon: <Milk className='h-4 w-4' />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'egg',
    name: '鸡蛋',
    category: '蛋类',
    severity: 'MODERATE',
    description: '鸡蛋中的蛋白质过敏原，常见于儿童',
    symptoms: ['皮肤瘙痒', '湿疹', '呼吸困难', '消化不良'],
    icon: <Egg className='h-4 w-4' />,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'wheat',
    name: '小麦',
    category: '谷物类',
    severity: 'MILD',
    description: '小麦中的蛋白质过敏原，与麸质过敏不同',
    symptoms: ['皮肤瘙痒', '鼻塞', '消化不良', '头痛'],
    icon: <Wheat className='h-4 w-4' />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  {
    id: 'soy',
    name: '大豆',
    category: '豆类',
    severity: 'MILD',
    description: '大豆及豆制品中的蛋白质过敏原',
    symptoms: ['皮疹', '口腔瘙痒', '消化不良', '呼吸道症状'],
    icon: <Bug className='h-4 w-4' />,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
];

const SEVERITY_CONFIG = {
  MILD: {
    label: '轻度',
    icon: <AlertCircle className='h-4 w-4' />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  MODERATE: {
    label: '中度',
    icon: <AlertTriangle className='h-4 w-4' />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  SEVERE: {
    label: '严重',
    icon: <XCircle className='h-4 w-4' />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
};

export function AllergenIdentifier({
  ingredients,
  userAllergens = [],
  showDetails = false,
  onAllergenClick,
}: AllergenIdentifierProps) {
  const [detectedAllergens, setDetectedAllergens] = useState<Allergen[]>([]);
  const [highRiskAllergens, setHighRiskAllergens] = useState<Allergen[]>([]);
  const [showAllergenDetails, setShowAllergenDetails] = useState(false);
  const [hiddenAllergens, setHiddenAllergens] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    analyzeAllergens();
  }, [ingredients, userAllergens]);

  const analyzeAllergens = () => {
    const detected: Allergen[] = [];
    const highRisk: Allergen[] = [];

    ingredients.forEach((ingredient) => {
      const ingredientAllergens = ingredient.allergens || [];

      ingredientAllergens.forEach((allergenId) => {
        const allergen = COMMON_ALLERGENS.find((a) => a.id === allergenId);
        if (allergen && !detected.find((a) => a.id === allergen.id)) {
          detected.push(allergen);

          // 检查是否为用户过敏原
          if (
            userAllergens.includes(allergen.id) ||
            userAllergens.includes(allergen.name) ||
            userAllergens.includes(allergen.category)
          ) {
            highRisk.push(allergen);
          }
        }
      });
    });

    setDetectedAllergens(detected);
    setHighRiskAllergens(highRisk);
  };

  const toggleAllergenVisibility = (allergenId: string) => {
    const newHidden = new Set(hiddenAllergens);
    if (newHidden.has(allergenId)) {
      newHidden.delete(allergenId);
    } else {
      newHidden.add(allergenId);
    }
    setHiddenAllergens(newHidden);
  };

  const visibleAllergens = detectedAllergens.filter(
    (allergen) => !hiddenAllergens.has(allergen.id),
  );

  const getRiskLevel = (): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (highRiskAllergens.length > 0) {
      const hasSevere = highRiskAllergens.some((a) => a.severity === 'SEVERE');
      return hasSevere ? 'CRITICAL' : 'HIGH';
    }

    if (detectedAllergens.length > 0) {
      const hasModerateOrSevere = detectedAllergens.some(
        (a) => a.severity === 'MODERATE' || a.severity === 'SEVERE',
      );
      return hasModerateOrSevere ? 'MEDIUM' : 'LOW';
    }

    return 'LOW';
  };

  const riskLevel = getRiskLevel();
  const riskConfig = {
    LOW: {
      label: '低风险',
      color: 'text-green-600 bg-green-50',
      icon: <CheckCircle className='h-4 w-4' />,
    },
    MEDIUM: {
      label: '中风险',
      color: 'text-yellow-600 bg-yellow-50',
      icon: <AlertCircle className='h-4 w-4' />,
    },
    HIGH: {
      label: '高风险',
      color: 'text-orange-600 bg-orange-50',
      icon: <AlertTriangle className='h-4 w-4' />,
    },
    CRITICAL: {
      label: '极高风险',
      color: 'text-red-600 bg-red-50',
      icon: <XCircle className='h-4 w-4' />,
    },
  };

  const currentRisk = riskConfig[riskLevel];

  if (detectedAllergens.length === 0) {
    return (
      <Card className='bg-green-50 border-green-200'>
        <CardContent className='p-4'>
          <div className='flex items-center gap-2'>
            <CheckCircle className='h-5 w-5 text-green-600' />
            <span className='text-green-800 font-medium'>
              未检测到常见过敏原
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Bug className='h-5 w-5' />
          过敏原分析
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* 风险等级 */}
        <Alert className={currentRisk.color}>
          {currentRisk.icon}
          <AlertDescription className='flex items-center justify-between'>
            <span>
              <strong>{currentRisk.label}</strong>
              {riskLevel === 'CRITICAL' && ' - 包含您的过敏原！'}
              {riskLevel === 'HIGH' && ' - 建议谨慎食用'}
              {riskLevel === 'MEDIUM' && ' - 可能有轻微过敏风险'}
              {riskLevel === 'LOW' && ' - 过敏风险较低'}
            </span>
            <Badge variant='outline'>
              {visibleAllergens.length}/{detectedAllergens.length} 显示
            </Badge>
          </AlertDescription>
        </Alert>

        {/* 高风险过敏原警告 */}
        {highRiskAllergens.length > 0 && (
          <Alert className='bg-red-50 border-red-200'>
            <XCircle className='h-4 w-4 text-red-600' />
            <AlertDescription>
              <div className='font-medium text-red-900 mb-2'>
                ⚠️ 检测到您的过敏原：
              </div>
              <div className='flex flex-wrap gap-2'>
                {highRiskAllergens.map((allergen) => (
                  <Badge
                    key={allergen.id}
                    className='bg-red-100 text-red-800 border-red-200 cursor-pointer'
                    onClick={() => onAllergenClick?.(allergen.name)}
                  >
                    {allergen.icon}
                    {allergen.name}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 过敏原列表 */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h4 className='font-medium text-gray-900'>
              检测到的过敏原 ({visibleAllergens.length})
            </h4>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowAllergenDetails(!showAllergenDetails)}
              >
                {showAllergenDetails ? (
                  <EyeOff className='h-3 w-3 mr-1' />
                ) : (
                  <Eye className='h-3 w-3 mr-1' />
                )}
                {showAllergenDetails ? '隐藏详情' : '显示详情'}
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {visibleAllergens.map((allergen) => (
              <div
                key={allergen.id}
                className={`p-3 border rounded-lg ${allergen.color} ${
                  highRiskAllergens.includes(allergen)
                    ? 'ring-2 ring-red-300'
                    : ''
                }`}
              >
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    {allergen.icon}
                    <span className='font-medium'>{allergen.name}</span>
                    <Badge variant='outline' className='text-xs'>
                      {allergen.category}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-1'>
                    {SEVERITY_CONFIG[allergen.severity].icon}
                    <span
                      className={`text-xs ${SEVERITY_CONFIG[allergen.severity].color}`}
                    >
                      {SEVERITY_CONFIG[allergen.severity].label}
                    </span>
                  </div>
                </div>

                {showAllergenDetails && (
                  <div className='space-y-2 text-sm'>
                    <p className='text-gray-700'>{allergen.description}</p>
                    <div>
                      <span className='font-medium text-gray-900'>
                        可能症状：
                      </span>
                      <div className='flex flex-wrap gap-1 mt-1'>
                        {allergen.symptoms.map((symptom, index) => (
                          <Badge
                            key={index}
                            variant='secondary'
                            className='text-xs'
                          >
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex gap-2 mt-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onAllergenClick?.(allergen.name)}
                    className='text-xs'
                  >
                    查看食材
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleAllergenVisibility(allergen.id)}
                    className='text-xs text-gray-500'
                  >
                    隐藏
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 隐藏的过敏原 */}
        {hiddenAllergens.size > 0 && (
          <div className='text-center'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setHiddenAllergens(new Set())}
            >
              显示所有过敏原 ({hiddenAllergens.size} 个已隐藏)
            </Button>
          </div>
        )}

        {/* 安全提示 */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
          <div className='flex items-start gap-2'>
            <Info className='h-4 w-4 text-blue-600 mt-0.5' />
            <div className='text-sm text-blue-800'>
              <div className='font-medium mb-1'>安全提示</div>
              <ul className='space-y-1 text-xs'>
                <li>• 如果您有食物过敏史，请谨慎食用含过敏原的食品</li>
                <li>• 严重过敏者应避免食用相关过敏原食品</li>
                <li>• 如有不适，请立即就医并告知医生可能的过敏原</li>
                <li>• 建议随身携带抗过敏药物（如有处方）</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
