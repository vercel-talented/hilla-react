import { expect, use } from '@esm-bundle/chai';
import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { useBinder as _useBinder, useBinderNode } from '../src/index.js';
import { type Login, LoginModel, type User, type UserModel } from './models.js';

use(sinonChai);

async function sleep(timeout: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, timeout));
}

describe('@hilla/react-form', () => {
  type UseBinderSpy = sinon.SinonSpy<Parameters<typeof _useBinder>, ReturnType<typeof _useBinder>>;
  const useBinder = sinon.spy(_useBinder) as typeof _useBinder;

  let onSubmit: (value: Login) => Promise<Login>;

  type UserFormProps = Readonly<{
    model: UserModel;
  }>;

  function UserForm({ model: m }: UserFormProps) {
    const { field, model } = useBinderNode<User, UserModel>(m);

    return (
      <fieldset>
        <input data-testid="user.name" type="text" {...field(model.name)} />
        <input data-testid="user.password" type="text" {...field(model.password)} />
      </fieldset>
    );
  }

  function LoginForm() {
    const { field, model, read, submit } = useBinder(LoginModel, { onSubmit });

    return (
      <>
        <section>
          <UserForm model={model.user} />
          <input data-testid="rememberMe" type="checkbox" {...field(model.rememberMe)} />
        </section>
        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
        <button data-testid="submit" onClick={submit}>
          Submit
        </button>
      </>
    );
  }

  beforeEach(() => {
    onSubmit = sinon.stub();
    (useBinder as UseBinderSpy).resetHistory();
  });

  describe('useBinder', () => {
    it('collects info from a form', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<LoginForm />);

      await user.click(getByTestId('user.name'));
      await user.keyboard('johndoe');
      await user.click(getByTestId('user.password'));
      await user.keyboard('john123456');
      await user.click(getByTestId('rememberMe'));
      await user.click(getByTestId('submit'));

      expect(onSubmit).to.have.been.calledWithMatch({
        rememberMe: true,
        user: {
          name: 'johndoe',
          password: 'john123456',
        },
      });
    });

    it('does not call onSubmit if the form is invalid', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<LoginForm />);

      await user.click(getByTestId('user.name'));
      await user.keyboard('johndoe');
      await user.click(getByTestId('submit'));

      expect(onSubmit).to.not.have.been.called;
    });

    it('does not call onSubmit if the form has not been touched', async () => {
      const user = userEvent.setup();
      const { getByTestId } = render(<LoginForm />);

      await user.click(getByTestId('submit'));

      expect(onSubmit).to.not.have.been.called;
    });

    it('shows empty values by default', async () => {
      const { getByTestId } = render(<LoginForm />);

      expect(getByTestId('user.name')).to.have.property('value', '');
      expect(getByTestId('user.password')).to.have.property('value', '');
      expect(getByTestId('rememberMe')).to.have.property('checked', false);
    });

    it('shows read values', async () => {
      const { getByTestId } = render(<LoginForm />);

      await sleep(0); // endpoint roundtrip
      const { read } = (useBinder as UseBinderSpy).returnValues[0];

      read({
        rememberMe: true,
        user: {
          id: 1,
          name: 'johndoe',
          password: 'john123456',
        },
      });

      await sleep(0); // react batched updates

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(getByTestId('user.name')).to.have.property('value', 'johndoe');
      expect(getByTestId('user.password')).to.have.property('value', 'john123456');
      expect(getByTestId('rememberMe')).to.have.property('checked', true);
    });
  });
});
