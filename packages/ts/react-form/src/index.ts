/* eslint-disable @typescript-eslint/unbound-method */
import {
  _fromString,
  _validity,
  type AbstractModel,
  type BinderConfiguration,
  type BinderNode,
  BinderRoot,
  CHANGED,
  type DetachedModelConstructor,
  type FieldStrategy,
  getBinderNode,
  getDefaultFieldStrategy,
  hasFromString,
  isFieldElement,
  type Validator,
  type Value,
  type ValueError,
} from '@vaadin/hilla-lit-form';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { Writable } from 'type-fest';

// @ts-expect-error: esbuild injection
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
__REGISTER__();

function useUpdate() {
  const [_, update] = useReducer((x: number) => x + 1, 0);
  return update;
}

export type FieldDirectiveResult = Readonly<{
  name: string;
  onBlur(): void;
  onChange(): void;
  onInput(): void;
  ref(element: HTMLElement | null): void;
}>;

export type FieldDirective = (model: AbstractModel) => FieldDirectiveResult;

export type UseFormPartResult<M extends AbstractModel> = Readonly<{
  defaultValue?: Value<M>;
  dirty: boolean;
  errors: readonly ValueError[];
  invalid: boolean;
  model: M;
  name: string;
  field: FieldDirective;
  ownErrors: ReadonlyArray<ValueError<Value<M>>>;
  required: boolean;
  validators: ReadonlyArray<Validator<Value<M>>>;
  value?: Value<M>;
  visited: boolean;
  addValidator(validator: Validator<Value<M>>): void;
  setValidators(validators: ReadonlyArray<Validator<Value<M>>>): void;
  setValue(value: Value<M> | undefined): void;
  setVisited(visited: boolean): void;
  validate(): Promise<readonly ValueError[]>;
}>;

export type UseFormResult<M extends AbstractModel> = Omit<UseFormPartResult<M>, 'setValue' | 'value'> &
  Readonly<{
    value: Value<M>;
    submitting: boolean;
    setDefaultValue(value: Value<M>): void;
    setValue(value: Value<M>): void;
    submit(): Promise<Value<M> | undefined | void>;
    reset(): void;
    clear(): void;
    read(value: Value<M> | null | undefined): void;
    update(): void;
  }>;

type FieldState<T = unknown> = {
  required: boolean;
  invalid: boolean;
  errorMessage: string;
  strategy?: FieldStrategy<T>;
  element?: HTMLElement;
  changeBlurHandler(): void;
  updateValue(): void;
  markVisited(): void;
  ref(element: HTMLElement | null): void;
};

function convertFieldValue<T extends AbstractModel>(model: T, fieldValue: unknown) {
  return typeof fieldValue === 'string' && hasFromString(model) ? model[_fromString](fieldValue) : fieldValue;
}

function getFormPart<M extends AbstractModel>(node: BinderNode<M>): Omit<UseFormPartResult<M>, 'field'> {
  return {
    addValidator: node.addValidator.bind(node),
    defaultValue: node.defaultValue,
    dirty: node.dirty,
    errors: node.errors,
    invalid: node.invalid,
    model: node.model,
    name: node.name,
    ownErrors: node.ownErrors,
    required: node.required,
    setValidators(validators) {
      node.validators = validators;
    },
    setValue(value) {
      node.value = value;
    },
    setVisited(visited: boolean) {
      node.visited = visited;
    },
    validate: node.validate.bind(node),
    validators: node.validators,
    value: node.value,
    visited: node.visited,
  };
}

function useFields<M extends AbstractModel>(node: BinderNode<M>): FieldDirective {
  return useMemo(() => {
    const registry = new WeakMap<AbstractModel, FieldState>();

    return ((model: AbstractModel) => {
      const n = getBinderNode(model);

      let fieldState = registry.get(model);

      if (!fieldState) {
        fieldState = {
          element: undefined,
          errorMessage: '',
          invalid: false,
          changeBlurHandler() {
            fieldState!.updateValue();
            fieldState!.markVisited();
          },
          markVisited() {
            n.visited = true;
          },
          ref(element: HTMLElement | null) {
            if (!element) {
              fieldState!.element?.removeEventListener('change', fieldState!.changeBlurHandler);
              fieldState!.element?.removeEventListener('input', fieldState!.updateValue);
              fieldState!.element?.removeEventListener('blur', fieldState!.changeBlurHandler);
              fieldState!.strategy?.removeEventListeners();
              fieldState!.element = undefined;
              fieldState!.strategy = undefined;
              return;
            }

            if (!isFieldElement(element)) {
              throw new TypeError(`Element '${element.localName}' is not a form element`);
            }

            if (fieldState!.element !== element) {
              fieldState!.element = element;
              fieldState!.element.addEventListener('change', fieldState!.changeBlurHandler);
              fieldState!.element.addEventListener('input', fieldState!.updateValue);
              fieldState!.element.addEventListener('blur', fieldState!.changeBlurHandler);
              fieldState!.strategy = getDefaultFieldStrategy(element, model);
            }
          },
          required: false,
          strategy: undefined,
          updateValue() {
            if (fieldState!.strategy) {
              // Remove invalid flag, so that .checkValidity() in Vaadin Components
              // does not interfere with errors from Hilla.
              fieldState!.strategy.invalid = false;
              // When bad input is detected, skip reading new value in binder state
              fieldState!.strategy.checkValidity();
              n[_validity] = fieldState!.strategy.validity;
              n.value = convertFieldValue(model, fieldState!.strategy.value);
            }
          },
        };

        registry.set(model, fieldState);
      }

      if (fieldState.strategy) {
        const valueFromField = convertFieldValue(model, fieldState.strategy.value);
        if (valueFromField !== n.value && !(Number.isNaN(n.value) && Number.isNaN(valueFromField))) {
          fieldState.strategy.value = Number.isNaN(n.value) ? '' : n.value;
        }

        if (fieldState.required !== n.required) {
          fieldState.required = n.required;
          fieldState.strategy.required = n.required;
        }

        const firstError = n.ownErrors.at(0);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const errorMessage = firstError?.message ?? '';
        if (fieldState.errorMessage !== errorMessage) {
          fieldState.errorMessage = errorMessage;
          fieldState.strategy.errorMessage = errorMessage;
        }

        // Make sure invalid state is always in sync
        fieldState.invalid = n.invalid;
        fieldState.strategy.invalid = n.invalid;
      }

      return {
        name: n.name,
        ref: fieldState.ref,
      };
    }) as FieldDirective;
  }, [node]);
}

export function useForm<M extends AbstractModel>(
  Model: DetachedModelConstructor<M>,
  config?: BinderConfiguration<Value<M>>,
): UseFormResult<M> {
  const configRef = useRef<Writable<BinderConfiguration<Value<M>>>>({});
  configRef.current.onSubmit = config?.onSubmit;
  configRef.current.onChange = config?.onChange;
  const update = useUpdate();
  const binder = useMemo(() => new BinderRoot(Model, configRef.current), [Model]);
  const field = useFields(binder);

  useEffect(() => {
    binder.addEventListener(CHANGED.type, update);
  }, [binder]);

  return {
    ...getFormPart(binder),
    clear: binder.clear.bind(binder),
    field,
    read: binder.read.bind(binder),
    reset: binder.reset.bind(binder),
    setDefaultValue(defaultValue) {
      binder.defaultValue = defaultValue;
    },
    setValue(value) {
      binder.value = value;
    },
    submit: binder.submit.bind(binder),
    value: binder.value,
    submitting: binder.submitting,
    update,
  };
}

export function useFormPart<M extends AbstractModel>(model: M): UseFormPartResult<M> {
  const binderNode = getBinderNode(model);
  const field = useFields(binderNode);
  return {
    ...getFormPart(binderNode),
    field,
  };
}
