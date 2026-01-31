import { render, screen } from '@testing-library/react';
import DmProfilePanel from '../dm-profile-panel';

describe('DmProfilePanel', () => {
  it('展示默认 DM 风格描述', () => {
    render(
      <DmProfilePanel profiles={[{ id: 'dm-default', name: '温和推进', summary: '偏向剧情推进', isDefault: true }]} />,
    );

    expect(screen.getByText('偏向剧情推进')).toBeInTheDocument();
  });
});
