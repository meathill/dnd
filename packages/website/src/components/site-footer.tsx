import { BrandFooter } from 'meathill-brand-react';
import { getRequestSession } from '@/lib/auth/session';

export async function SiteFooter() {
  const session = await getRequestSession();
  if (session) {
    return null;
  }

  return (
    <BrandFooter
      currentSiteId="muirpg"
      description="选择模组和人物卡，与 AI 一起完成遵循清晰规则、持续发展的线上跑团。"
      locale="zh"
    />
  );
}
