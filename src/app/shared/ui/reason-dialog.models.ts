export interface ReasonOption<T extends string = string> {
  code: T;
  label: string;
}

export interface ReasonDialogConfig<T extends string = string> {
  title: string;
  description: string;
  options: readonly ReasonOption<T>[];
  confirmLabel: string;
  danger: boolean;
}
