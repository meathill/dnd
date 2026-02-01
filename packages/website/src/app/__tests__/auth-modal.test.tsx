import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from '../auth-modal';

describe('账号弹窗', () => {
  it('注册模式显示昵称输入并允许切换到登录', async () => {
    const user = userEvent.setup();
    const handleModeChange = vi.fn();

    render(
      <AuthModal
        isOpen
        isSubmitting={false}
        mode="signUp"
        isSignUpEnabled
        email=""
        password=""
        displayName=""
        message=""
        onClose={() => {}}
        onSubmit={() => {}}
        onModeChange={handleModeChange}
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        onDisplayNameChange={() => {}}
      />,
    );

    expect(screen.getByLabelText('昵称')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '已有账号？去登录' }));
    expect(handleModeChange).toHaveBeenCalledWith('signIn');
  });

  it('登录模式不显示昵称并可提交', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <AuthModal
        isOpen
        isSubmitting={false}
        mode="signIn"
        isSignUpEnabled
        email=""
        password=""
        displayName=""
        message=""
        onClose={() => {}}
        onSubmit={handleSubmit}
        onModeChange={() => {}}
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        onDisplayNameChange={() => {}}
      />,
    );

    expect(screen.queryByLabelText('昵称')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('禁止注册时隐藏切换按钮', () => {
    render(
      <AuthModal
        isOpen
        isSubmitting={false}
        mode="signIn"
        isSignUpEnabled={false}
        email=""
        password=""
        displayName=""
        message=""
        onClose={() => {}}
        onSubmit={() => {}}
        onModeChange={() => {}}
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        onDisplayNameChange={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: '没有账号？去注册' })).not.toBeInTheDocument();
    expect(screen.getByText('当前关闭注册')).toBeInTheDocument();
  });
});
