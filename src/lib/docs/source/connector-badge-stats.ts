/**
 * 按 frontmatter `badge.label` 原样聚合连接器数量。
 * 不预设「已上线 / 待上线」等业务文案——任意 label 均可。
 */

export type ConnectorBadgeInput = {
  label?: string;
  color?: string;
};

export type ConnectorBadgeStat = {
  label: string;
  count: number;
  color?: string;
};

/** 无 badge / 空 label 时的占位分组名（仍计入总数） */
export const UNLABELED_BADGE_LABEL = '未标注';

export function aggregateConnectorBadgeStats(
  badges: Array<ConnectorBadgeInput | undefined | null>,
): {
  connectorTotal: number;
  connectorBadgeStats: ConnectorBadgeStat[];
} {
  const byLabel = new Map<string, { count: number; color?: string }>();

  for (const badge of badges) {
    const rawLabel = badge?.label?.trim();
    const label = rawLabel && rawLabel.length > 0 ? rawLabel : UNLABELED_BADGE_LABEL;
    const color =
      typeof badge?.color === 'string' && badge.color.trim()
        ? badge.color.trim()
        : undefined;

    const prev = byLabel.get(label);
    if (prev) {
      prev.count += 1;
      if (!prev.color && color) prev.color = color;
    } else {
      byLabel.set(label, { count: 1, color });
    }
  }

  const connectorBadgeStats = [...byLabel.entries()]
    .map(([label, v]) => ({ label, count: v.count, color: v.color }))
    .sort((a, b) => {
      // 「未标注」始终置底，避免与业务 badge 抢视觉重心
      const aUnlabeled = a.label === UNLABELED_BADGE_LABEL ? 1 : 0;
      const bUnlabeled = b.label === UNLABELED_BADGE_LABEL ? 1 : 0;
      if (aUnlabeled !== bUnlabeled) return aUnlabeled - bUnlabeled;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'zh-CN');
    });

  return {
    connectorTotal: badges.length,
    connectorBadgeStats,
  };
}
